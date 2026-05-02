import os
import time
import json
import pandas as pd
import tiktoken
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

from langchain_community.document_loaders import (
    PyPDFium2Loader,
    TextLoader,
    UnstructuredHTMLLoader,
    CSVLoader,
    UnstructuredExcelLoader,
    UnstructuredWordDocumentLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from elastic_store import ElasticStore

try:
    from langchain.retrievers.contextual_compression import ContextualCompressionRetriever
except ImportError:
    from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_community.document_compressors.flashrank_rerank import FlashrankRerank
from langchain_experimental.text_splitter import SemanticChunker
from langchain_core.prompts import PromptTemplate

# Load environment variables with override
load_dotenv(override=True)

# Import db for system prompt retrieval
import db as rag_db

# Import tabular handler
from tabular_engine import TabularDataHandler

class RAGEngine:
    def __init__(self, collection_name: str, embeddings=None, llm=None):
        self.collection_name = collection_name
        self.chunk_size = int(os.getenv("CHUNK_SIZE", 800))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", 100))
        self.chunking_strategy = os.getenv("CHUNKING_STRATEGY", "recursive").lower()
        self.persist_directory = os.getenv("PERSIST_DIRECTORY", "./chroma_db")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        # Initialize embeddings
        if embeddings:
            self.embeddings = embeddings
        else:
            self.embeddings = HuggingFaceEmbeddings(model_name=self.embedding_model_name)

        # Initialize LLM
        if llm:
            self.llm = llm
        else:
            self.llm = self._setup_llm()

        # Initialize Vector Store (use Elasticsearch)
        # Add rag_ prefix for Elasticsearch index name
        index_name = f"rag_{self.collection_name}"
        self.vectorstore = ElasticStore(
            index_name=index_name,
            embeddings=self.embeddings
        )

        # Initialize tabular data handler for this collection
        self.tabular_handler = TabularDataHandler(collection_name)


    def _setup_llm(self):
        provider = os.getenv("LLM_PROVIDER", "ollama").lower()
        if provider == "ollama":
            return ChatOllama(
                model=os.getenv("OLLAMA_MODEL", "llama3.2"),
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            )
        elif provider == "openai":
            return ChatOpenAI(
                model_name="gpt-3.5-turbo",
                api_key=os.getenv("OPENAI_API_KEY")
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

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
            text_splitter = SemanticChunker(self.embeddings)
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
        5. Still creates text chunks for semantic search

        Returns the number of chunks created.
        """
        import pandas as pd

        # Load the file
        df, metadata = self.tabular_handler.load_file(file_path)

        # Create SQLite database for SQL queries
        sql_conn = self.tabular_handler.create_sqlite_db(df, self.tabular_handler.table_name)

        # Store metadata in database
        filename = os.path.basename(file_path)
        self.tabular_handler.store_metadata(filename, metadata)

        # Create text chunks from the DataFrame for semantic search
        # Convert DataFrame to markdown-style text for better retrieval
        chunks = self._df_to_chunks(df, filename)

        total_chunks = len(chunks)

        # Add chunks to Elasticsearch
        batch_size = 10000
        for i in range(0, total_chunks, batch_size):
            batch = chunks[i:i+batch_size]
            self.vectorstore.add_documents(batch)
            if progress_callback:
                progress_callback((i + len(batch)) / total_chunks)

        return total_chunks

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

        # ElasticStore returns a LangChain-compatible vector retriever
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
        except:
            # Fallback to simple word-based estimate if tiktoken fails
            return len(text.split()) * 1.3 # common heuristic: 1.3 tokens per word

    def _optimize_query(self, question: str):
        """Transforms and expands the user query for better retrieval."""
        optimized_queries = [question]
        transformation_log = ""

        # 1. Query Transformation (De-jargon/Clarify)
        if os.getenv("QUERY_TRANSFORMATION", "false").lower() == "true":
            try:
                transform_prompt = f"""You are a retrieval expert. Rewrite the following user question to be more descriptive and suitable for a vector database search. Remove jargon and clarify vague terms based on general knowledge.
User Question: {question}
Rewritten Question:"""
                transformed = self.llm.invoke(transform_prompt).content.strip()
                optimized_queries = [transformed]
                transformation_log += f"**Transformed Query:** {transformed}\n"
            except Exception as e:
                print(f"Query Transformation Error: {e}")

        # 2. Query Expansion (Multi-Query)
        if os.getenv("QUERY_EXPANSION", "false").lower() == "true":
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
                print(f"Query Expansion Error: {e}")

        return list(set(optimized_queries)), transformation_log

    def _build_memory_prefix(
        self,
        chat_history: Optional[List[Dict[str, Any]]],
        long_term_memory: Optional[str],
    ) -> str:
        """Format short-term chat and long-term memory blocks for injection before retrieved docs."""
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

        if long_term_memory and long_term_memory.strip():
            parts.append(
                "Relevant past Q&A from stored history (long-term memory):\n"
                + long_term_memory.strip()
            )

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

    def _query_tabular_sql(self, question: str) -> Dict[str, Any]:
        """
        Convert a natural language question to SQL and execute it.

        Args:
            question: Natural language question about the tabular data

        Returns:
            Dictionary with results, sql_query, and metadata
        """
        # Get stored tabular files
        files = self.tabular_handler.get_stored_files()
        if not files:
            return {'error': 'No tabular data found', 'sql_used': False}

        # Get the most recent file
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

        # If we still don't have a query, return error
        if not sql_query:
            return {'error': error_msg or 'Could not generate SQL query', 'sql_used': False}

        # Execute the query
        handler = TabularDataHandler(self.collection_name)

        # Load the original DataFrame and create a fresh connection
        import pandas as pd
        import os
        docs_dir = os.path.join("./documents", self.collection_name)
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
        docs_dir = os.path.join("./documents", self.collection_name)
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

        # Pattern: "What is the total [column]?"
        total_match = re.search(r'total\s+([a-zA-Z_][a-zA-Z0-9_]*)', question_lower)
        if total_match:
            col = total_match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT SUM({column_names_lower[col_normalized]}) as total FROM {table_name}"

        # Pattern: "What is the average [column]?"
        avg_match = re.search(r'average\s+([a-zA-Z_][a-zA-Z0-9_]*)', question_lower)
        if avg_match:
            col = avg_match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT AVG({column_names_lower[col_normalized]}) as average FROM {table_name}"

        # Pattern: "What is the sum of [column]?"
        sum_match = re.search(r'sum\s+of\s+([a-zA-Z_][a-zA-Z0-9_]*)', question_lower)
        if sum_match:
            col = sum_match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT SUM({column_names_lower[col_normalized]}) as total FROM {table_name}"

        # Pattern: "What is the maximum [column]?"
        max_match = re.search(r'maximum|highest|largest\s+([a-zA-Z_][a-zA-Z0-9_]*)', question_lower)
        if max_match:
            col = max_match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT MAX({column_names_lower[col_normalized]}) as max_value FROM {table_name}"

        # Pattern: "What is the minimum [column]?"
        min_match = re.search(r'minimum|lowest|smallest\s+([a-zA-Z_][a-zA-Z0-9_]*)', question_lower)
        if min_match:
            col = min_match.group(1)
            col_normalized = col.lower()
            if col_normalized in column_names_lower:
                return f"SELECT MIN({column_names_lower[col_normalized]}) as min_value FROM {table_name}"

        # Pattern: "Count the number of [rows/records]"
        count_match = re.search(r'count\s+(?:the\s+)?(number\s+of\s+)?(rows?|records?)', question_lower)
        if count_match:
            return f"SELECT COUNT(*) as count FROM {table_name}"

        # Pattern: "Show me [columns] from [table]"
        select_match = re.search(r'show\s+me\s+([a-zA-Z_,\s]+)\s+from\s+', question_lower)
        if select_match:
            cols = select_match.group(1).strip()
            # Validate columns exist
            valid_cols = [column_names_lower.get(c.strip().lower(), c.strip()) for c in cols.split(',') if c.strip().lower() in column_names_lower]
            if valid_cols:
                return f"SELECT {', '.join(valid_cols)} FROM {table_name}"

        # Pattern: "Give me all data"
        if 'all' in question_lower and ('data' in question_lower or 'rows' in question_lower or 'records' in question_lower):
            return f"SELECT * FROM {table_name}"

        # Pattern: "What is the first [column]?" or "Show first rows"
        first_match = re.search(r'first\s+(\d+)?\s*(rows?|records?)?', question_lower)
        if first_match:
            limit = first_match.group(1)
            if limit:
                return f"SELECT * FROM {table_name} LIMIT {limit}"
            else:
                return f"SELECT * FROM {table_name} LIMIT 10"

        # Pattern: "What is the last [column]?" or "Show last rows"
        last_match = re.search(r'last\s+(\d+)?\s*(rows?|records?)?', question_lower)
        if last_match:
            limit = last_match.group(1)
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
            retrieved_docs: Documents from Elasticsearch retrieval

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

    def query(
        self,
        question: str,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        long_term_memory: Optional[str] = None,
    ):
        """Queries the RAG system and measures performance metrics with optional reasoning."""
        start_time = time.time()

        # Query Optimization
        queries, optimization_log = self._optimize_query(question)

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
            source_documents = retriever.invoke(question)

        # Get system prompt from database
        system_prompt = self._get_system_prompt()

        # Define a prompt template that encourages reasoning.
        # In LangChain 1.x, prompts live in `langchain_core.prompts`.
        from langchain_core.prompts import PromptTemplate

        template = f"""{{system_prompt}}

The context below may include:
(1) recent conversation with the user,
(2) similar past Q&A from stored history,
(3) retrieved document excerpts from the knowledge base.

Use all relevant parts to answer. If the answer is not supported by the context, say that you don't know.
For follow-up questions, use the recent conversation when the user refers to "it", "that", etc.

IMPORTANT: Respond in the SAME LANGUAGE as the user's question. If the question is in Chinese, answer in Chinese. If in English, answer in English.

First, provide your step-by-step reasoning based ONLY on the provided context (including memory blocks).
Then, provide the final concise answer.

Context:
{{context}}

Question: {{question}}

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

        # Always build generation context manually so short-term / long-term memory can be injected.
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

        contexts = [doc.page_content for doc in source_documents]

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
        long_term_memory: Optional[str] = None,
    ):
        """
        Stream the RAG response token by token.
        Yields: ("reasoning", chunk) during reasoning phase, ("answer", chunk) during answer phase
        Returns final result dict via StopIteration value (or use send() pattern)
        """
        start_time = time.time()

        # Query Optimization
        queries, optimization_log = self._optimize_query(question)

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
            source_documents = retriever.invoke(question)

        # Get system prompt from database
        system_prompt = self._get_system_prompt()

        from langchain_core.prompts import PromptTemplate

        template = f"""{{system_prompt}}

The context below may include:
(1) recent conversation with the user,
(2) similar past Q&A from stored history,
(3) retrieved document excerpts from the knowledge base.

Use all relevant parts to answer. If the answer is not supported by the context, say that you don't know.
For follow-up questions, use the recent conversation when the user refers to "it", "that", etc.

IMPORTANT: Respond in the SAME LANGUAGE as the user's question. If the question is in Chinese, answer in Chinese. If in English, answer in English.

First, provide your step-by-step reasoning based ONLY on the provided context (including memory blocks).
Then, provide the final concise answer.

Context:
{{context}}

Question: {{question}}

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

            # Detect phase transition
            if not in_answer and "ANSWER:" in full_text:
                # First time we see ANSWER:, split and yield remaining
                if "REASONING:" in full_text:
                    parts = full_text.split("ANSWER:")
                    reasoning_part = parts[0].replace("REASONING:", "").strip()
                    answer_part = "ANSWER:" + "ANSWER:".join(parts[1:])

                    # Yield remaining reasoning (should be nothing new usually)
                    # Then switch to answer mode
                    in_answer = True

                    # Extract just the new answer content
                    ans_content = answer_part.replace("ANSWER:", "", 1).strip()
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

        contexts = [doc.page_content for doc in source_documents]

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
        # For Elasticsearch, we need the full source path
        # First, find the source path from metadata
        query = {
            "query": {
                "term": {"source": source_basename}
            }
        }
        result = self.vectorstore.client.search(index=self.vectorstore.index_name, body=query)
        hits = result.get("hits", {}).get("hits", [])

        if not hits:
            return False

        # Get the full source path from the first hit
        full_path = hits[0]["_source"].get("source")
        if full_path:
            deleted_count = self.vectorstore.delete_documents_by_source(full_path)
            return deleted_count > 0
        return False

    @staticmethod
    def delete_collection(collection_name: str):
        """Permanently deletes a collection and its contents (Elasticsearch index, documents, tabular data, database records)."""
        from elastic_store import ElasticStore
        import os
        import shutil
        import db

        collection_name = collection_name.lower()
        index_name = f"rag_{collection_name}"

        try:
            # Delete from Elasticsearch
            success = ElasticStore.delete_index_by_name(index_name)

            # Delete tabular data from database
            db.delete_tabular_files_by_collection(collection_name)

            # Delete conversations, messages, qa_runs, ratings from database
            db.delete_collection_data(collection_name)

            # Delete documents directory
            docs_dir = os.path.join("./documents", collection_name)
            if os.path.exists(docs_dir):
                shutil.rmtree(docs_dir)

            return success
        except Exception as e:
            print(f"Error deleting collection {collection_name}: {e}")
            return False

    @staticmethod
    def rename_collection(old_name: str, new_name: str) -> tuple:
        """Renames a collection in Elasticsearch. Returns (success, message)."""
        from elastic_store import ElasticStore
        import os

        old_name = old_name.lower()
        new_name = new_name.lower()
        old_index = f"rag_{old_name}"
        new_index = f"rag_{new_name}"

        try:
            # Rename the Elasticsearch index
            success, msg = ElasticStore.rename_index(old_index, new_index)
            return success, msg
        except Exception as e:
            return False, f"Error renaming collection: {e}"

    @staticmethod
    def list_collections():
        """Lists all available collections in Elasticsearch, excluding internal ones."""
        from elastic_store import ElasticStore

        # Get all indices (with or without rag_ prefix)
        indices = ElasticStore.get_all_indices(prefix="*")

        # Convert index names to collection names (remove rag_ prefix if present)
        collections = []
        for index in indices:
            coll_name = index
            # Remove 'rag_' prefix if present
            if coll_name.startswith("rag_"):
                coll_name = coll_name[4:]
            # Filter out internal indices
            if coll_name and not coll_name.startswith(".") and not coll_name.startswith("_"):
                collections.append(coll_name)

        # Filter out test collections
        collections = [c for c in collections if not c.startswith("test_collection_")]
        return sorted(set(collections))  # Remove duplicates if any

    @staticmethod
    def validate_collection_name(name: str):
        """Validates if a collection name follows Elasticsearch index rules."""
        import re
        name = name.lower()  # Auto-lowercase for validation

        if not (3 <= len(name) <= 63):
            return False, "Name must be between 3 and 63 characters."

        # Elasticsearch index names must be lowercase
        if name != name.lower():
            return False, "Name must be lowercase."

        # Elasticsearch index cannot contain certain characters
        invalid_chars = ['\\', '/', '*', '?', '"', '<', '>', '|', ' ', ',', '#', ':']
        for char in invalid_chars:
            if char in name:
                return False, f"Name cannot contain character: {char}"

        if ".." in name:
            return False, "Name cannot contain consecutive dots."

        # Elasticsearch index names cannot start or end with hyphen/underscore
        if name.startswith('-') or name.startswith('_') or name.endswith('-') or name.endswith('_'):
            return False, "Name cannot start or end with hyphen or underscore."

        return True, ""

    @staticmethod
    def create_collection(collection_name: str, embedding_dims: int = None):
        """Explicitly creates a collection in Elasticsearch.

        Args:
            collection_name: Name of the collection
            embedding_dims: Number of dimensions for the embedding vector.
                           If None, reads from EMBEDDING_DIMS env var or defaults to 1024.
        """
        from elastic_store import ElasticStore

        collection_name = collection_name.lower()  # Ensure lowercase
        valid, msg = RAGEngine.validate_collection_name(collection_name)
        if not valid:
            return False, msg

        # Add rag_ prefix for Elasticsearch index name
        index_name = f"rag_{collection_name}"

        try:
            success, msg = ElasticStore.create_index(index_name, embedding_dims)
            return success, msg
        except Exception as e:
            if "resource_already_exists_exception" in str(e):
                return True, f"Collection '{collection_name}' already exists."
            return False, f"Error creating collection: {e}"
