import os
import time
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
        batch_size = 50
        for i in range(0, total_chunks, batch_size):
            batch = chunks[i:i+batch_size]
            self.vectorstore.add_documents(batch)
            if progress_callback:
                progress_callback((i + len(batch)) / total_chunks)

        return total_chunks

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

        # Always build generation context manually so short-term / long-term memory can be injected.
        retrieved_text = "\n\n".join([doc.page_content for doc in source_documents])
        memory_prefix = self._build_memory_prefix(chat_history, long_term_memory)
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

        retrieved_text = "\n\n".join([doc.page_content for doc in source_documents])
        memory_prefix = self._build_memory_prefix(chat_history, long_term_memory)
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
        """Permanently deletes a collection and its contents in Elasticsearch."""
        from elastic_store import ElasticStore
        import os

        collection_name = collection_name.lower()
        index_name = f"rag_{collection_name}"

        try:
            # Delete from Elasticsearch
            success = ElasticStore.delete_index_by_name(index_name)
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
    def create_collection(collection_name: str):
        """Explicitly creates a collection in Elasticsearch."""
        from elastic_store import ElasticStore

        collection_name = collection_name.lower()  # Ensure lowercase
        valid, msg = RAGEngine.validate_collection_name(collection_name)
        if not valid:
            return False, msg

        # Add rag_ prefix for Elasticsearch index name
        index_name = f"rag_{collection_name}"

        try:
            success, msg = ElasticStore.create_index(index_name)
            return success, msg
        except Exception as e:
            if "resource_already_exists_exception" in str(e):
                return True, f"Collection '{collection_name}' already exists."
            return False, f"Error creating collection: {e}"
