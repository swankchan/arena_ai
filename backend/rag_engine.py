"""
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

import os
import time
import json
import logging
import pandas as pd
import tiktoken
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('rag_engine.log'),
        logging.StreamHandler()
    ]
)

from langchain_community.document_loaders import (
    PyPDFium2Loader,
    TextLoader,
    UnstructuredHTMLLoader,
    CSVLoader,
    UnstructuredExcelLoader,
    UnstructuredWordDocumentLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.embeddings import (
    create_embeddings,
    embed_similarity_query,
    get_embedding_model_name,
    semantic_chunking_embeddings,
)
from backend.lance_store import LanceStore
from backend.llm_config import create_llm

try:
    from langchain.retrievers.contextual_compression import ContextualCompressionRetriever
except ImportError:
    from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_community.document_compressors.flashrank_rerank import FlashrankRerank
from langchain_experimental.text_splitter import SemanticChunker

# Load environment variables with override
load_dotenv(override=True)

DOCUMENTS_DIR = os.getenv("DOCUMENTS_DIRECTORY", "./documents")

# Import db for system prompt retrieval
from backend import db as rag_db

# Import tabular handler
from backend.tabular_engine import TabularDataHandler

class RAGEngine:
    def __init__(self, collection_name: str, embeddings=None, llm=None):
        self.collection_name = collection_name
        self.chunk_size = int(os.getenv("CHUNK_SIZE", 800))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", 100))
        self.chunking_strategy = os.getenv("CHUNKING_STRATEGY", "recursive").lower()
        self.embedding_model_name = get_embedding_model_name()
        # Initialize embeddings
        if embeddings:
            self.embeddings = embeddings
        else:
            self.embeddings = create_embeddings()

        # Initialize LLM
        if llm:
            self.llm = llm
        else:
            self.llm = self._setup_llm()

        # Initialize the embedded vector store for this collection
        table_name = f"rag_{self.collection_name}"
        self.vectorstore = LanceStore(
            table_name=table_name,
            embeddings=self.embeddings
        )

        # Initialize tabular data handler for this collection
        self.tabular_handler = TabularDataHandler(collection_name)


    def _setup_llm(self):
        """Create a chat model backed by the local llama.cpp server."""
        return create_llm()

    def _get_system_prompt(self) -> str:
        """Get the current system prompt from the database.
        Returns collection_guard (always active) combined with all enabled user prompts.
        """
        try:
            # Always include collection_guard as the base
            guard_prompt = rag_db.get_system_prompt_by_name("collection_guard")
            if not guard_prompt:
                # Fallback if collection_guard doesn't exist in DB
                return """You are a helpful AI assistant specialized in answering questions based on the provided knowledge base.

IMPORTANT GUIDELINES:
- ONLY answer questions about the content in the provided context
- If the question is about a topic outside the context, respond: "I cannot find information about this in the provided knowledge base."
- Do not use your general knowledge - stick strictly to the context
- If the context does not contain enough information to answer fully, say what you can based on the context"""

            system_prompt = guard_prompt.get("content", "")

            # Append all enabled user prompts (is_default=0 means enabled)
            user_prompts = rag_db.list_system_prompts()
            for p in user_prompts:
                if p['name'] != 'collection_guard' and not p.get('is_default', True):
                    system_prompt += "\n\n" + p.get("content", "")

            return system_prompt
        except Exception:
            pass
        # Fallback default
        return """You are a helpful AI assistant specialized in answering questions based on the provided knowledge base.

IMPORTANT GUIDELINES:
- ONLY answer questions about the content in the provided context
- If the question is about a topic outside the context, respond: "I cannot find information about this in the provided knowledge base."
- Do not use your general knowledge - stick strictly to the context
- If the context does not contain enough information to answer fully, say what you can based on the context"""

    def add_documents(self, file_path: str, progress_callback=None):
        """Loads, splits, and adds documents to the current collection with progress reporting."""
        ext = file_path.lower().split('.')[-1]

        # Handle tabular data specially
        if ext in ["csv", "xlsx", "xls"]:
            return self._add_tabular_document(file_path, progress_callback)

        # Non-tabular documents
        if ext == "pdf":
            loader = PyPDFium2Loader(file_path)
        elif ext == "csv":
            loader = CSVLoader(file_path)
        elif ext in ["xlsx", "xls"]:
            loader = UnstructuredExcelLoader(file_path)
        elif ext in ["docx", "doc"]:
            loader = UnstructuredWordDocumentLoader(file_path)
        elif ext in ["html", "htm"]:
            loader = UnstructuredHTMLLoader(file_path)
        else:
            loader = TextLoader(file_path)

        documents = loader.load()

        if self.chunking_strategy == "semantic":
            text_splitter = SemanticChunker(
                semantic_chunking_embeddings(self.embeddings)
            )
        else:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap
            )

        chunks = text_splitter.split_documents(documents)
        total_chunks = len(chunks)

        # Adding in batches to report progress
        batch_size = 10000
        for i in range(0, total_chunks, batch_size):
            batch = chunks[i:i+batch_size]
            self.vectorstore.add_documents(batch)
            if progress_callback:
                progress_callback((i + len(batch)) / total_chunks)

        return total_chunks

    def _add_tabular_document(self, file_path: str, progress_callback=None) -> int:
        """
        Handle tabular data files (CSV, XLSX, XLS) specially.

        This method:
        1. Loads the file into a pandas DataFrame
        2. Creates a SQLite database for SQL queries
        3. Generates analysis metadata
        4. Stores the data for Text-to-SQL queries
        5. Does NOT create chunks for vector search (tabular data is queried via SQL)

        Returns 0 (no chunks created for vector search).
        """
        # Load the file
        df, metadata = self.tabular_handler.load_file(file_path)

        # Create SQLite database for SQL queries
        sql_conn = self.tabular_handler.create_sqlite_db(df, self.tabular_handler.table_name)
        sql_conn.close()

        # Store metadata in database
        filename = os.path.basename(file_path)
        self.tabular_handler.store_metadata(filename, metadata)

        # Tabular data is NOT chunked for vector search
        # It is queried directly via SQL/Pandas analysis
        if progress_callback:
            progress_callback(1.0)  # Complete

        return 0

    def _df_to_chunks(self, df: pd.DataFrame, source_name: str) -> List[Any]:
        """
        Convert a DataFrame to text chunks for vector search.

        Creates chunks with:
        1. A schema chunk describing column types
        2. Sample data chunks showing actual values
        3. Combined text for each row with column names

        Args:
            df: DataFrame to convert
            source_name: Name of the source file

        Returns:
            List of Document objects
        """
        from langchain_core.documents import Document

        chunks = []

        # Get column information
        columns_info = ", ".join([f"{col} ({df[col].dtype})" for col in df.columns])

        # Schema chunk
        schema_text = f"""Table: {source_name}
Columns: {columns_info}
Row count: {len(df)}

This table contains structured data from {source_name}. Use SQL queries to analyze numeric columns and filter by categorical columns."""
        chunks.append(Document(
            page_content=schema_text,
            metadata={"source": source_name, "chunk_type": "schema"}
        ))

        # Sample data chunk (first 10000 rows as formatted table)
        if len(df) > 0:
            sample_rows = df.head(10000)
            try:
                sample_text = "Sample data (first 10000 rows):\n\n" + sample_rows.to_markdown(index=False)
            except ImportError:
                # Fallback if tabulate is not installed
                sample_text = "Sample data (first 10000 rows):\n\n" + sample_rows.to_string(index=False)
            chunks.append(Document(
                page_content=sample_text,
                metadata={"source": source_name, "chunk_type": "sample"}
            ))

        # Full data chunk (10000 or all rows, but truncated if too large)
        if len(df) <= 10000:
            # Small dataset: include all rows
            try:
                full_text = "All data:\n\n" + df.to_markdown(index=False)
            except ImportError:
                full_text = "All data:\n\n" + df.to_string(index=False)
        else:
            # Large dataset: include summary stats
            try:
                numeric_summary = df.describe().to_markdown()
            except ImportError:
                numeric_summary = df.describe().to_string()
            full_text = f"""Data summary (first 10000 rows shown):

{df.head(10000).to_markdown(index=False)}

Numeric column statistics:
{numeric_summary}
"""
        chunks.append(Document(
            page_content=full_text,
            metadata={"source": source_name, "chunk_type": "data"}
        ))

        return chunks

    def get_retriever(self):
        """Returns a retriever with reranking."""
        top_k = int(os.getenv("TOP_K", 4))

        # LanceStore returns a LangChain-compatible vector retriever
        base_retriever = self.vectorstore.get_retriever(top_k=top_k)

        # Reranking
        if os.getenv("RERANKING", "false").lower() == "true":
            compressor = FlashrankRerank(model=os.getenv("RERANK_MODEL", "ms-marco-MiniLM-L-12-v2"))
            compression_retriever = ContextualCompressionRetriever(
                base_compressor=compressor, base_retriever=base_retriever
            )
            return compression_retriever

        return base_retriever

    def _count_tokens(self, text: str):
        """Estimate token count using tiktoken (OpenAI) or a heuristic."""
        try:
            encoding = tiktoken.get_encoding("cl100k_base") # common encoding
            return len(encoding.encode(text))
        except Exception:
            # Fallback to simple word-based estimate if tiktoken fails
            return len(text.split()) * 1.3 # common heuristic: 1.3 tokens per word

    def _optimize_query(
        self,
        question: str,
        query_transformation: Optional[bool] = None,
        query_expansion: Optional[bool] = None,
    ):
        """Transform a query with request-scoped, never global, options."""
        optimized_queries = [question]
        transformation_log = ""
        transform_enabled = (
            os.getenv("QUERY_TRANSFORMATION", "false").lower() == "true"
            if query_transformation is None
            else query_transformation
        )
        expansion_enabled = (
            os.getenv("QUERY_EXPANSION", "false").lower() == "true"
            if query_expansion is None
            else query_expansion
        )

        # 1. Query Transformation (De-jargon/Clarify)
        if transform_enabled:
            try:
                transform_prompt = f"""You are a retrieval expert. Rewrite the following user question to be more descriptive and suitable for a vector database search. Remove jargon and clarify vague terms based on general knowledge.
User Question: {question}
Rewritten Question:"""
                transformed = self.llm.invoke(transform_prompt).content.strip()
                optimized_queries = [transformed]
                transformation_log += f"**Transformed Query:** {transformed}\n"
            except Exception as e:
                logging.error(f"Query Transformation Error: {e}")

        # 2. Query Expansion (Multi-Query)
        if expansion_enabled:
            try:
                base_query = optimized_queries[0]
                expansion_prompt = f"""Generate 3 different variations of the following question to capture different aspects and phrasings. Provide ONLY the variations, one per line.
Question: {base_query}"""
                variations = self.llm.invoke(expansion_prompt).content.strip().split("\n")
                # Clean and filter variations
                variations = [v.strip("- ").strip() for v in variations if v.strip()]
                optimized_queries.extend(variations[:3])
                transformation_log += "**Expanded Queries:**\n" + "\n".join([f"- {v}" for v in variations[:3]])
            except Exception as e:
                logging.error(f"Query Expansion Error: {e}")

        return list(set(optimized_queries)), transformation_log

    def _build_memory_prefix(
        self,
        chat_history: Optional[List[Dict[str, Any]]],
        long_term_memory: Optional[str],
    ) -> str:
        """Format short-term chat memory and long-term memory blocks for injection before retrieved docs."""
        parts: List[str] = []
        max_msgs = int(os.getenv("CHAT_HISTORY_MAX_MESSAGES", "12"))
        max_chars = int(os.getenv("CHAT_HISTORY_MAX_CHARS_PER_MESSAGE", "2000"))

        if chat_history:
            lines: List[str] = []
            for m in chat_history[-max_msgs:]:
                role = (m.get("role") or "user").strip()
                content = (m.get("content") or "").strip()
                if not content:
                    continue
                # Avoid flooding context with huge assistant blobs (metrics/sources)
                if len(content) > max_chars:
                    content = content[:max_chars] + "…"
                lines.append(f"{role.upper()}: {content}")
            if lines:
                parts.append("Recent conversation (short-term memory):\n" + "\n".join(lines))

        # Long-term memory from past Q&A (optional, controlled by LONG_TERM_MEMORY_ENABLED env var)
        if long_term_memory:
            parts.append("Relevant past Q&A (long-term memory):\n" + long_term_memory)

        return "\n\n".join(parts) if parts else ""

    def _has_tabular_data(self) -> bool:
        """Check if this collection has any tabular data loaded."""
        files = self.tabular_handler.get_stored_files()
        return len(files) > 0

    def _is_tabular_question(self, question: str) -> bool:
        """Determine if a question is about tabular data based on keywords."""
        tabular_keywords = [
            'sum', 'total', 'average', 'mean', 'count', 'maximum', 'minimum',
            'highest', 'lowest', 'largest', 'smallest', 'max', 'min',
            'trend', 'trends', 'growth', 'change', 'percentage', 'rate',
            'compare', 'correlation', 'relationship',
            'first', 'last', 'top', 'bottom', 'rank',
            'how many', 'total of', 'sum of',
            'column', 'row', 'table', 'data', 'excel', 'spreadsheet',
            'file', 'csv', 'xlsx'
        ]
        question_lower = question.lower()
        # Use word boundary matching for more precise matching
        import re
        # Count keyword matches
        matches = sum(1 for keyword in tabular_keywords if re.search(r'\b' + re.escape(keyword) + r'\b', question_lower))
        # Consider it a tabular question if we have at least 1 match and question seems to be asking about data
        return matches >= 1 and ('what' in question_lower or 'how' in question_lower or 'tell' in question_lower)

    def query_tabular_sql(
        self,
        question: str,
        file_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Public API for natural-language queries against a selected table."""
        return self._query_tabular_sql(question, file_id=file_id)

    def _query_tabular_sql(
        self,
        question: str,
        file_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Convert a natural-language question to SQL and execute it."""
        files = self.tabular_handler.get_stored_files()
        if file_id is not None:
            files = [item for item in files if item.get("id") == file_id]
        if not files:
            return {'error': 'No tabular data found', 'sql_used': False}

        file_info = files[0]
        filename = file_info['filename']
        table_name = file_info['table_name']

        # Get column info from metadata
        columns_info = json.loads(file_info.get('columns_json', '{}'))
        column_names = list(columns_info.keys())
        column_details = json.dumps(columns_info, indent=2)

        # Build SQL query - try simple rule-based first, then LLM
        sql_query = None
        error_msg = None
        sql_generation_log = ""

        # Try simple rule-based SQL generation first
        if not sql_query:
            sql_query = self._generate_simple_sql(question, table_name, column_names)
            if sql_query:
                sql_generation_log = f"Generated SQL using pattern matching: `{sql_query}`\n"

        # If simple generation failed, try LLM
        if not sql_query:
            if not self.llm:
                return {'error': 'LLM not available for SQL generation', 'sql_used': False}
            try:
                sql_prompt = f"""You are a SQL query generator. Convert the following question to a valid SQLite SQL query.

Table name: {table_name}
Column names and types:
{column_details}

Question: {question}

Return ONLY the SQL query, nothing else. Use standard SQL syntax compatible with SQLite.
"""
                sql_query = self.llm.invoke(sql_prompt).content.strip()

                # Clean up the SQL query - remove markdown code blocks and other wrappers
                if sql_query.startswith("```"):
                    # Try to extract from markdown code block
                    lines = sql_query.split("```")
                    for line in lines:
                        if "SELECT" in line.upper() or "select" in line:
                            sql_query = line.strip()
                            break

                sql_query = sql_query.strip('`').strip()
                sql_query = sql_query.replace("SQL:", "").replace("sql:", "").strip()

                # Ensure it starts with SELECT
                if sql_query.upper().startswith("SELECT") == False:
                    # Try to find SELECT in the query
                    select_idx = sql_query.upper().find("SELECT")
                    if select_idx >= 0:
                        sql_query = sql_query[select_idx:]
                    else:
                        sql_query = None
                        error_msg = "LLM did not return a valid SQL query"
                elif sql_query.upper().startswith("SELECT"):
                    sql_generation_log = f"Generated SQL using LLM: `{sql_query}`\n"
            except Exception as e:
                error_msg = f"LLM SQL generation failed: {e}"
                logging.error(f"SQL generation error for question '{question}': {e}")

        # If we still don't have a query, return error
        if not sql_query:
            return {'error': error_msg or 'Could not generate SQL query', 'sql_used': False}

        # Execute the query
        handler = TabularDataHandler(self.collection_name)

        # Load the original DataFrame and create a fresh connection
        import pandas as pd
        import os
        docs_dir = os.path.join(DOCUMENTS_DIR, self.collection_name)
        tabular_files = [f for f in os.listdir(docs_dir) if f.endswith(('.csv', '.xlsx', '.xls'))]

        if not tabular_files:
            return {'error': 'No tabular files found', 'sql_used': False}

        # Find the matching file based on filename
        df = None
        for fname in tabular_files:
            if fname == filename:
                fpath = os.path.join(docs_dir, fname)
                df, _ = handler.load_file(fpath)
                break

        if df is None:
            return {'error': 'Could not find tabular data', 'sql_used': False}

        # Create in-memory SQLite DB
        sql_conn = handler.create_sqlite_db(df, table_name)

        # Execute the query
        results = handler.query_sql(sql_conn, sql_query)
        sql_conn.close()

        # Format results for display
        results_text = ""
        if results and isinstance(results, list) and len(results) > 0:
            try:
                results_df = pd.DataFrame(results)
                # Show all results (up to 200 rows for readability)
                max_rows = 200
                if len(results) <= max_rows:
                    results_text = results_df.to_markdown(index=False)
                else:
                    results_text = results_df.head(max_rows).to_markdown(index=False)
                    results_text += f"\n\n... and {len(results) - max_rows} more rows"
            except Exception:
                results_text = str(results)[:1000]

        return {
            'sql_used': True,
            'sql_query': sql_query,
            'sql_generation_log': sql_generation_log,
            'results': results,
            'results_text': results_text,
            'results_count': len(results) if isinstance(results, list) else 0
        }

    def _analyze_tabular_data(self, question: str) -> Dict[str, Any]:
        """
        Perform pandas-based analysis on tabular data.

        Args:
            question: The question being asked

        Returns:
            Dictionary with analysis results
        """
        if not self._has_tabular_data():
            return {'error': 'No tabular data found', 'analysis_used': False}

        # Load the tabular data
        docs_dir = os.path.join(DOCUMENTS_DIR, self.collection_name)
        tabular_files = [f for f in os.listdir(docs_dir) if f.endswith(('.csv', '.xlsx', '.xls'))]

        if not tabular_files:
            return {'error': 'No tabular files found', 'analysis_used': False}

        # Load the most recent file
        handler = TabularDataHandler(self.collection_name)
        fpath = os.path.join(docs_dir, tabular_files[0])

        try:
            df, metadata = handler.load_file(fpath)
        except Exception as e:
            return {'error': f'Failed to load data: {e}', 'analysis_used': False}

        # Determine analysis type based on question
        analysis_type = self._determine_analysis_type(question)

        try:
            results = handler.analyze_with_pandas(df, analysis_type)
            results['analysis_used'] = True
            results['analysis_type'] = analysis_type
            # Add the question that prompted this analysis
            results['analysis_question'] = question
        except Exception as e:
            results = {'error': str(e), 'analysis_used': False, 'analysis_type': analysis_type, 'analysis_question': question}

        return results

    def _generate_simple_sql(self, question: str, table_name: str, column_names: List[str]) -> Optional[str]:
        """
        Generate a simple SQL query based on common patterns in the question.
        Returns None if no pattern matches.

        Args:
            question: Natural language question
            table_name: Name of the table
            column_names: List of column names

        Returns:
            SQL query string or None
        """
        import re
        question_lower = question.lower()
        column_names_lower = {c.lower(): c for c in column_names}

        # Pre-compile regex patterns for performance
        patterns = {
            'total': re.compile(r'total\s+([a-zA-Z_][a-zA-Z0-9_]*)'),
            'average': re.compile(r'average\s+([a-zA-Z_][a-zA-Z0-9_]*)'),
            'sum_of': re.compile(r'sum\s+of\s+([a-zA-Z_][a-zA-Z0-9_]*)'),
            'maximum': re.compile(r'(?:maximum|highest|largest)\s+([a-zA-Z_][a-zA-Z0-9_]*)'),
            'minimum': re.compile(r'(?:minimum|lowest|smallest)\s+([a-zA-Z_][a-zA-Z0-9_]*)'),
            'count': re.compile(r'count\s+(?:the\s+)?(number\s+of\s+)?(rows?|records?)'),
            'show_me': re.compile(r'show\s+me\s+([a-zA-Z_,\s]+)\s+from\s+'),
            'first': re.compile(r'first\s+(\d+)?\s*(rows?|records?)?'),
            'last': re.compile(r'last\s+(\d+)?\s*(rows?|records?)?'),
            'top_n': re.compile(r'(?:top|bottom|first|last)\s+(\d+)\s+(?:rows?|records?)'),
            'order_by': re.compile(r'(?:sorted?|order(?:ed)?|sorted? by|order(?:ed)? by)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:asc|desc|ascending|descending)?'),
        }

        # Pattern: "What is the total [column]?"
        if match := patterns['total'].search(question_lower):
            col = match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT SUM({column_names_lower[col_normalized]}) as total FROM {table_name}"

        # Pattern: "What is the average [column]?"
        if match := patterns['average'].search(question_lower):
            col = match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT AVG({column_names_lower[col_normalized]}) as average FROM {table_name}"

        # Pattern: "What is the sum of [column]?"
        if match := patterns['sum_of'].search(question_lower):
            col = match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT SUM({column_names_lower[col_normalized]}) as total FROM {table_name}"

        # Pattern: "What is the maximum [column]?"
        if match := patterns['maximum'].search(question_lower):
            col = match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT MAX({column_names_lower[col_normalized]}) as max_value FROM {table_name}"

        # Pattern: "What is the minimum [column]?"
        if match := patterns['minimum'].search(question_lower):
            col = match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT MIN({column_names_lower[col_normalized]}) as min_value FROM {table_name}"

        # Pattern: "Count the number of [rows/records]"
        if match := patterns['count'].search(question_lower):
            return f"SELECT COUNT(*) as count FROM {table_name}"

        # Pattern: "Show me [columns] from [table]"
        if match := patterns['show_me'].search(question_lower):
            cols = match.group(1).strip()
            # Validate columns exist
            valid_cols = [column_names_lower.get(c.strip().lower(), c.strip()) for c in cols.split(',') if c.strip().lower() in column_names_lower]
            if valid_cols:
                return f"SELECT {', '.join(valid_cols)} FROM {table_name}"

        # Pattern: "Give me all data"
        if 'all' in question_lower and ('data' in question_lower or 'rows' in question_lower or 'records' in question_lower):
            return f"SELECT * FROM {table_name}"

        # Pattern: "Show first N rows" or "Show last N rows"
        if match := patterns['top_n'].search(question_lower):
            limit = match.group(1)
            if 'top' in question_lower or 'first' in question_lower:
                return f"SELECT * FROM {table_name} LIMIT {limit}"
            else:
                return f"SELECT * FROM {table_name} ORDER BY (SELECT 1) LIMIT {limit}"

        # Pattern: "ORDER BY" support
        if match := patterns['order_by'].search(question_lower):
            order_col = match.group(1)
            order_dir = match.group(2) or "ASC"
            order_dir = "ASC" if order_dir.lower() in ("", "asc", "ascending") else "DESC"
            if order_col.lower() in column_names_lower:
                return f"SELECT * FROM {table_name} ORDER BY {column_names_lower[order_col.lower()]} {order_dir}"

        # Pattern: "What is the first row" or "Show first rows"
        if match := patterns['first'].search(question_lower):
            limit = match.group(1)
            if limit:
                return f"SELECT * FROM {table_name} LIMIT {limit}"
            else:
                return f"SELECT * FROM {table_name} LIMIT 10"

        # Pattern: "What is the last row" or "Show last rows"
        if match := patterns['last'].search(question_lower):
            limit = match.group(1)
            if limit:
                return f"SELECT * FROM {table_name} ORDER BY (SELECT 1) LIMIT {limit}"
            else:
                return f"SELECT * FROM {table_name} ORDER BY (SELECT 1) LIMIT 10"

        return None

    def _determine_analysis_type(self, question: str) -> str:
        """Determine the appropriate pandas analysis type based on the question."""
        question_lower = question.lower()

        if 'trend' in question_lower or 'growth' in question_lower or 'change' in question_lower:
            return 'trend'
        elif 'correlation' in question_lower or 'relationship' in question_lower:
            return 'correlation'
        elif 'summary' in question_lower or 'overview' in question_lower:
            return 'summary'
        elif 'group' in question_lower or 'by' in question_lower:
            return 'groupby'
        else:
            # Default to stats for general questions
            return 'stats'

    def _build_tabular_context(self, sql_results: Dict, pandas_results: Dict,
                               retrieved_docs: List[Any]) -> str:
        """
        Build context string combining SQL results, pandas analysis, and retrieved docs.

        Args:
            sql_results: Results from _query_tabular_sql
            pandas_results: Results from _analyze_tabular_data
            retrieved_docs: Documents from vector-store retrieval

        Returns:
            Combined context string
        """
        parts = []

        # Add SQL results if available
        if sql_results.get('sql_used') and sql_results.get('results'):
            if sql_results.get('sql_generation_log'):
                parts.append(f"SQL Generation Log:\n{sql_results['sql_generation_log']}")
            parts.append("SQL Query Results:")
            results_text = sql_results.get('results_text', '')
            if results_text:
                parts.append(results_text)
            else:
                results = sql_results.get('results', [])
                if results:
                    try:
                        import pandas as pd
                        df = pd.DataFrame(results)
                        parts.append(df.to_markdown(index=False))
                    except:
                        # Show up to 200 rows in context
                        try:
                            results_df = pd.DataFrame(results)
                            if len(results) <= 200:
                                parts.append(results_df.to_markdown(index=False))
                            else:
                                parts.append(results_df.head(200).to_markdown(index=False))
                                parts.append(f"\n... and {len(results) - 200} more rows")
                        except Exception:
                            parts.append(str(results)[:2000])
            parts.append("")

        # Add pandas analysis if available
        if pandas_results.get('analysis_used') and not pandas_results.get('error'):
            analysis_type = pandas_results.get('analysis_type', 'unknown')
            parts.append(f"Pandas {analysis_type.upper()} Analysis:")
            parts.append(str(pandas_results)[:1000])
            parts.append("")

        # Add retrieved documents
        if retrieved_docs:
            parts.append("Retrieved Documents:")
            for doc in retrieved_docs:
                parts.append(f"---\n{doc.page_content}")

        return "\n\n".join(parts)

    def _get_long_term_memory(self, question: str, collection_name: str, top_k: int = 3) -> str:
        """
        Retrieve similar past Q&A from the database for long-term memory.

        Args:
            question: Current question to find similar past Q&A
            collection_name: Name of the collection
            top_k: Number of past Q&A to retrieve

        Returns:
            Formatted string of past Q&A or empty string if disabled/not available
        """
        # Check if long-term memory is enabled
        if os.getenv("LONG_TERM_MEMORY_ENABLED", "false").lower() != "true":
            return ""

        try:
            from backend import db as rag_db

            # Get embedding for the question if available
            try:
                query_embedding = embed_similarity_query(
                    self.embeddings,
                    question,
                )
            except Exception:
                query_embedding = None

            if query_embedding is None:
                return ""

            # Search for similar past Q&A
            similar_qa = rag_db.search_similar_qa(
                collection_name=collection_name,
                query_embedding=query_embedding,
                top_k=top_k,
            )

            if not similar_qa:
                return ""

            # Format the memory entries
            memory_parts = []
            for item in similar_qa[:top_k]:
                if item.get('similarity', 0) < 0.3:  # Threshold for relevance
                    continue
                memory_parts.append(
                    f"Past Question {len(memory_parts)+1}: {item['question']}\n"
                    f"Past Answer {len(memory_parts)+1}: {item['answer']}"
                )

            return "\n\n".join(memory_parts)

        except Exception as e:
            logging.error(f"Error retrieving long-term memory: {e}")
            return ""

    def query(
        self,
        question: str,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        query_transformation: Optional[bool] = None,
        query_expansion: Optional[bool] = None,
    ):
        """Queries the RAG system and measures performance metrics with optional reasoning."""
        start_time = time.time()

        # Query Optimization
        queries, optimization_log = self._optimize_query(
            question,
            query_transformation,
            query_expansion,
        )

        retriever = self.get_retriever()

        # If multi-query, we need to combine results from all queries
        all_source_docs = []
        if len(queries) > 1:
            for q in queries:
                all_source_docs.extend(retriever.invoke(q))
            # Deduplicate by content (use hash to avoid keeping all content in memory)
            unique_docs = []
            seen_hashes = set()
            for doc in all_source_docs:
                content_hash = hash(doc.page_content)
                if content_hash not in seen_hashes:
                    unique_docs.append(doc)
                    seen_hashes.add(content_hash)
            # Take top K again after merging
            top_k = int(os.getenv("TOP_K", 4))
            source_documents = unique_docs[:top_k * 2] # Allow a bit more context for multi-query
        else:
            source_documents = retriever.invoke(queries[0])

        # Get system prompt from database
        system_prompt = self._get_system_prompt()

        # Retrieve long-term memory if enabled
        long_term_memory = self._get_long_term_memory(
            question,
            self.collection_name,
            top_k=int(os.getenv("LONG_TERM_MEMORY_TOP_K", "3")),
        )

        # Define a prompt template that encourages reasoning.
        # In LangChain 1.x, prompts live in `langchain_core.prompts`.
        from langchain_core.prompts import PromptTemplate

        template = """{system_prompt}

The context below may include:
(1) recent conversation with the user (short-term memory),
(2) similar past Q&A from stored history (long-term memory),
(3) retrieved document excerpts from the knowledge base.

Use all relevant parts to answer. If the answer is not supported by the context, say that you don't know.
For follow-up questions, use the recent conversation when the user refers to "it", "that", etc.

IMPORTANT: Respond in the SAME LANGUAGE as the user's question. If the question is in Chinese, answer in Chinese. If in English, answer in English.

First, provide your step-by-step reasoning based ONLY on the provided context (including memory blocks).
Then, provide the final concise answer.

Context:
{context}

Question: {question}

Format your response as:
REASONING: [Your step-by-step reasoning]
ANSWER: [Your final answer]
"""
        PROMPT = PromptTemplate(
            template=template, input_variables=["context", "question"]
        )

        # Check if we have tabular data and the question is about tabular data
        sql_results = {}
        pandas_results = {}
        if self._has_tabular_data() and self._is_tabular_question(question):
            sql_results = self._query_tabular_sql(question)
            pandas_results = self._analyze_tabular_data(question)

        # Always build generation context manually so short-term memory can be injected.
        retrieved_text = "\n\n".join([doc.page_content for doc in source_documents])
        memory_prefix = self._build_memory_prefix(chat_history, long_term_memory)

        # Check if tabular results should be included
        if self._has_tabular_data() and self._is_tabular_question(question):
            # Use tabular context with SQL and pandas results
            context_text = self._build_tabular_context(sql_results, pandas_results, source_documents)
        else:
            # Use standard context with memory prefix
            if memory_prefix:
                context_text = memory_prefix + "\n\n---\n\nRetrieved documents:\n" + retrieved_text
            else:
                context_text = retrieved_text

        # Inject system_prompt into the prompt text
        prompt_text = PROMPT.format(system_prompt=system_prompt, context=context_text, question=question)
        llm_resp = self.llm.invoke(prompt_text)
        full_text = getattr(llm_resp, "content", None) or str(llm_resp)

        duration = time.time() - start_time

        # Split reasoning and answer
        reasoning = ""
        answer = full_text
        if "REASONING:" in full_text and "ANSWER:" in full_text:
            try:
                parts = full_text.split("ANSWER:")
                answer = parts[1].strip()
                reasoning = parts[0].replace("REASONING:", "").strip()
            except:
                pass

        token_count = self._count_tokens(full_text)
        tps = token_count / duration if duration > 0 else 0

        return {
            "answer": answer,
            "reasoning": reasoning,
            "optimization_log": optimization_log,
            "sources": [doc.metadata.get("source", "Unknown") for doc in source_documents],
            "metrics": {
                "total_tokens": int(token_count),
                "tokens_per_second": round(tps, 2),
                "duration": round(duration, 2)
            }
        }

    def query_stream(
        self,
        question: str,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        query_transformation: Optional[bool] = None,
        query_expansion: Optional[bool] = None,
    ):
        """Stream reasoning and answer chunks, followed by a final result."""
        start_time = time.time()

        # Query Optimization
        queries, optimization_log = self._optimize_query(
            question,
            query_transformation,
            query_expansion,
        )

        retriever = self.get_retriever()

        # If multi-query, we need to combine results from all queries
        all_source_docs = []
        if len(queries) > 1:
            for q in queries:
                all_source_docs.extend(retriever.invoke(q))
            unique_docs = []
            seen_hashes = set()
            for doc in all_source_docs:
                content_hash = hash(doc.page_content)
                if content_hash not in seen_hashes:
                    unique_docs.append(doc)
                    seen_hashes.add(content_hash)
            top_k = int(os.getenv("TOP_K", 4))
            source_documents = unique_docs[:top_k * 2]
        else:
            source_documents = retriever.invoke(queries[0])

        # Get system prompt from database
        system_prompt = self._get_system_prompt()

        # Retrieve long-term memory if enabled
        long_term_memory = self._get_long_term_memory(
            question,
            self.collection_name,
            top_k=int(os.getenv("LONG_TERM_MEMORY_TOP_K", "3")),
        )

        from langchain_core.prompts import PromptTemplate

        template = """{system_prompt}

The context below may include:
(1) recent conversation with the user (short-term memory),
(2) similar past Q&A from stored history (long-term memory),
(3) retrieved document excerpts from the knowledge base.

Use all relevant parts to answer. If the answer is not supported by the context, say that you don't know.
For follow-up questions, use the recent conversation when the user refers to "it", "that", etc.

IMPORTANT: Respond in the SAME LANGUAGE as the user's question. If the question is in Chinese, answer in Chinese. If in English, answer in English.

First, provide your step-by-step reasoning based ONLY on the provided context (including memory blocks).
Then, provide the final concise answer.

Context:
{context}

Question: {question}

Format your response as:
REASONING: [Your step-by-step reasoning]
ANSWER: [Your final answer]
"""
        PROMPT = PromptTemplate(template=template, input_variables=["context", "question"])

        # Check if we have tabular data and the question is about tabular data
        sql_results = {}
        pandas_results = {}
        if self._has_tabular_data() and self._is_tabular_question(question):
            sql_results = self._query_tabular_sql(question)
            pandas_results = self._analyze_tabular_data(question)

        retrieved_text = "\n\n".join([doc.page_content for doc in source_documents])
        memory_prefix = self._build_memory_prefix(chat_history, long_term_memory)

        # Check if tabular results should be included
        if self._has_tabular_data() and self._is_tabular_question(question):
            context_text = self._build_tabular_context(sql_results, pandas_results, source_documents)
        else:
            if memory_prefix:
                context_text = memory_prefix + "\n\n---\n\nRetrieved documents:\n" + retrieved_text
            else:
                context_text = retrieved_text

        prompt_text = PROMPT.format(system_prompt=system_prompt, context=context_text, question=question)

        # Stream the response
        full_text = ""
        in_answer = False

        for chunk in self.llm.stream(prompt_text):
            content = getattr(chunk, "content", str(chunk))
            full_text += content

            # Detect phase transition. Final parsing below removes markers.
            if not in_answer and "ANSWER:" in full_text:
                if "REASONING:" in full_text:
                    in_answer = True
                    yield ("answer", content)
                else:
                    yield ("reasoning", content)
            elif in_answer:
                yield ("answer", content)
            else:
                yield ("reasoning", content)

        # Final parsing
        duration = time.time() - start_time
        reasoning = ""
        answer = full_text

        if "REASONING:" in full_text and "ANSWER:" in full_text:
            try:
                parts = full_text.split("ANSWER:")
                answer = parts[1].strip() if len(parts) > 1 else ""
                reasoning = parts[0].replace("REASONING:", "").strip()
            except Exception:
                pass

        token_count = self._count_tokens(full_text)
        tps = token_count / duration if duration > 0 else 0

        final_result = {
            "answer": answer,
            "reasoning": reasoning,
            "optimization_log": optimization_log,
            "sources": [doc.metadata.get("source", "Unknown") for doc in source_documents],
            "metrics": {
                "total_tokens": int(token_count),
                "tokens_per_second": round(tps, 2),
                "duration": round(duration, 2)
            }
        }

        # Return final result as the last yield
        yield ("final", final_result)

    def list_documents(self):
        """Lists all documents in the current collection."""
        return self.vectorstore.list_documents()

    def delete_document(self, source_basename: str):
        """Deletes all chunks associated with a specific document source."""
        full_path = self.vectorstore.find_document_source(source_basename)
        if not full_path:
            return False

        deleted_count = self.vectorstore.delete_documents_by_source(full_path)
        return deleted_count > 0

    @staticmethod
    def delete_collection(collection_name: str):
        """Delete a collection's vectors, documents, and database records."""
        import os
        import shutil
        from backend import db

        collection_name = collection_name.lower()
        table_name = f"rag_{collection_name}"

        try:
            success = LanceStore.delete_table_by_name(table_name)
            if not success:
                return False

            db.delete_tabular_files_by_collection(collection_name)
            db.delete_collection_data(collection_name)

            docs_dir = os.path.join(DOCUMENTS_DIR, collection_name)
            if os.path.exists(docs_dir):
                shutil.rmtree(docs_dir)

            return True
        except Exception as e:
            print(f"Error deleting collection {collection_name}: {e}")
            return False

    @staticmethod
    def rename_collection(old_name: str, new_name: str) -> tuple:
        """Rename a LanceDB collection table and its SQLite records."""
        old_name = old_name.lower()
        new_name = new_name.lower()
        old_table = f"rag_{old_name}"
        new_table = f"rag_{new_name}"

        try:
            success, msg = LanceStore.rename_table(old_table, new_table)
            if not success:
                return False, msg

            from backend.db import update_collection_name
            db_success = update_collection_name(old_name, new_name)
            if not db_success:
                return False, "Vectors renamed but database update failed"

            return True, f"Collection renamed successfully from '{old_name}' to '{new_name}'"
        except Exception as e:
            return False, f"Error renaming collection: {e}"

    @staticmethod
    def list_collections():
        """List all collection-scoped LanceDB tables."""
        collections = []
        for table_name in LanceStore.get_all_tables(prefix="rag_"):
            collection_name = table_name[4:]
            if collection_name and not collection_name.startswith("test_collection_"):
                collections.append(collection_name)

        return sorted(set(collections))

    @staticmethod
    def validate_collection_name(name: str):
        """Validate a collection name using the vector-store rules."""
        return LanceStore.validate_table_name(name)

    @staticmethod
    def create_collection(collection_name: str, embedding_dims: int = None):
        """Explicitly create an empty LanceDB collection table.

        If embedding_dims is omitted, EMBEDDING_DIMS is used (default: 768).
        """
        collection_name = collection_name.lower()
        valid, msg = RAGEngine.validate_collection_name(collection_name)
        if not valid:
            return False, msg

        table_name = f"rag_{collection_name}"
        return LanceStore.create_table(table_name, embedding_dims)
