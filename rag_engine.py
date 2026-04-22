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

try:
    from langchain.retrievers import EnsembleRetriever
    from langchain.retrievers.contextual_compression import ContextualCompressionRetriever
except ImportError:
    from langchain_classic.retrievers import EnsembleRetriever
    from langchain_classic.retrievers.contextual_compression import ContextualCompressionRetriever

from langchain_community.retrievers import BM25Retriever
from langchain_community.document_compressors.flashrank_rerank import FlashrankRerank
from langchain_experimental.text_splitter import SemanticChunker
from datasets import Dataset
from ragas import evaluate

# Load environment variables with override
load_dotenv(override=True)

class RAGEngine:
    def __init__(self, collection_name: str, embeddings=None, llm=None):
        self.collection_name = collection_name
        self.chunk_size = int(os.getenv("CHUNK_SIZE", 800))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", 100))
        self.chunking_strategy = os.getenv("CHUNKING_STRATEGY", "recursive").lower()
        self.persist_directory = os.getenv("PERSIST_DIRECTORY", "./chroma_db")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        # Search Settings
        self.hybrid_search = os.getenv("HYBRID_SEARCH", "false").lower() == "true"
        self.vector_weight = float(os.getenv("VECTOR_WEIGHT", 0.5))
        self.bm25_weight = float(os.getenv("BM25_WEIGHT", 0.5))
        
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
        
        # Initialize Vector Store
        self.vectorstore = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
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
        """Returns a retriever with optional hybrid search and reranking."""
        top_k = int(os.getenv("TOP_K", 4))
        base_retriever = self.vectorstore.as_retriever(search_kwargs={"k": top_k * 2 if os.getenv("RERANKING", "false").lower() == "true" else top_k})
        
        # Hybrid Search
        if self.hybrid_search:
            # For BM25, we need all documents in the collection
            # Using paging to avoid "too many SQL variables" error
            all_texts = []
            all_metadatas = []
            limit = 1000
            offset = 0
            while True:
                batch = self.vectorstore.get(include=['documents', 'metadatas'], limit=limit, offset=offset)
                if not batch['documents']:
                    break
                all_texts.extend(batch['documents'])
                all_metadatas.extend(batch['metadatas'])
                if len(batch['documents']) < limit:
                    break
                offset += limit
            
            if all_texts:
                from langchain_core.documents import Document
                docs = [Document(page_content=t, metadata=m) for t, m in zip(all_texts, all_metadatas)]
                bm25_retriever = BM25Retriever.from_documents(docs)
                bm25_retriever.k = top_k
                ensemble_retriever = EnsembleRetriever(
                    retrievers=[base_retriever, bm25_retriever],
                    weights=[self.vector_weight, self.bm25_weight]
                )
                retriever = ensemble_retriever
            else:
                retriever = base_retriever
        else:
            retriever = base_retriever
            
        # Reranking
        if os.getenv("RERANKING", "false").lower() == "true":
            compressor = FlashrankRerank(model=os.getenv("RERANK_MODEL", "ms-marco-MiniLM-L-12-v2"))
            compression_retriever = ContextualCompressionRetriever(
                base_compressor=compressor, base_retriever=retriever
            )
            return compression_retriever
            
        return retriever

    def _count_tokens(self, text: str):
        """Estimate token count using tiktoken (OpenAI) or a heuristic."""
        try:
            encoding = tiktoken.get_encoding("cl100k_base") # common encoding
            return len(encoding.encode(text))
        except:
            # Fallback to simple word-based estimate if tiktoken fails
            return len(text.split()) * 1.3 # common heuristic: 1.3 tokens per word
            
    def evaluate_response(self, question: str, answer: str, contexts: List[str]):
        """Evaluates the RAG response using RAGAS metrics."""
        try:
            # Prepare data for RAGAS
            data = {
                "question": [question],
                "answer": [answer],
                "contexts": [contexts],
            }
            dataset = Dataset.from_dict(data)
            
            # Wrap LLM and Embeddings for RAGAS
            from ragas.llms import LangchainLLMWrapper
            from ragas.embeddings import LangchainEmbeddingsWrapper
            
            ragas_llm = LangchainLLMWrapper(self.llm)
            ragas_embeddings = LangchainEmbeddingsWrapper(self.embeddings)
            
            # Initialize metrics with the LLM and Embeddings
            from ragas.metrics.collections import Faithfulness, AnswerRelevancy, ContextPrecision
            
            faithfulness = Faithfulness(llm=ragas_llm)
            answer_relevance = AnswerRelevancy(llm=ragas_llm, embeddings=ragas_embeddings)
            context_precision = ContextPrecision(llm=ragas_llm)
            
            # Run evaluation
            try:
                result = evaluate(
                    dataset=dataset,
                    metrics=[faithfulness, answer_relevance, context_precision],
                    llm=ragas_llm,
                    embeddings=ragas_embeddings
                )
            except Exception as e:
                # Newer RAGAS "collections" metrics require modern InstructorLLM,
                # and will reject LangChain wrappers (e.g. Ollama via LangChain).
                msg = str(e)
                needs_instructor = (
                    "only support modern InstructorLLM" in msg
                    or "Found: LangchainLLMWrapper" in msg
                    or "InstructorLLM" in msg
                )
                if not needs_instructor:
                    raise

                # Fallback: evaluate with ragas' llm_factory (InstructorLLM requirement).
                # This can work with:
                # - OpenAI (needs OPENAI_API_KEY)
                # - Ollama's OpenAI-compatible endpoint (no real key required)
                from openai import OpenAI
                from ragas.llms import llm_factory

                api_key = os.getenv("OPENAI_API_KEY")
                base_url = None

                if api_key:
                    # Real OpenAI usage
                    openai_client = OpenAI(api_key=api_key)
                    ragas_model = os.getenv("RAGAS_LLM_MODEL", "gpt-4o-mini")
                else:
                    # Local Ollama via OpenAI-compatible API
                    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
                    base_url = os.getenv("OPENAI_BASE_URL", "").strip() or f"{ollama_base}/v1"
                    if not base_url.endswith("/v1"):
                        base_url = base_url.rstrip("/") + "/v1"

                    # Ollama ignores the key but OpenAI client requires one.
                    openai_client = OpenAI(api_key="ollama", base_url=base_url)
                    ragas_model = os.getenv("RAGAS_LLM_MODEL", os.getenv("OLLAMA_MODEL", "qwen3.5:9b"))

                ragas_llm2 = llm_factory(ragas_model, client=openai_client)

                # Rebuild metrics with the new llm
                faithfulness2 = Faithfulness(llm=ragas_llm2)
                answer_relevance2 = AnswerRelevancy(llm=ragas_llm2, embeddings=ragas_embeddings)
                context_precision2 = ContextPrecision(llm=ragas_llm2)

                result = evaluate(
                    dataset=dataset,
                    metrics=[faithfulness2, answer_relevance2, context_precision2],
                    llm=ragas_llm2,
                    embeddings=ragas_embeddings
                )

            # Normalize output keys so the Streamlit UI can reliably render them.
            rec = result.to_pandas().to_dict(orient="records")[0]

            def pick_value(*key_candidates: str):
                # Exact match first
                for k in key_candidates:
                    if k in rec:
                        return rec[k]
                # Then substring match (handles *_score variants / naming changes)
                for k, v in rec.items():
                    kl = k.lower()
                    for cand in key_candidates:
                        if cand in kl:
                            return v
                return None

            normalized = {
                "faithfulness": pick_value("faithfulness", "faithfulness_score"),
                "answer_relevancy": pick_value("answer_relevancy", "answer_relevancy_score"),
                "answer_relevance": pick_value("answer_relevance", "answer_relevance_score"),
                "context_precision": pick_value("context_precision", "context_precision_score"),
            }

            # Keep raw for debugging if needed.
            normalized["raw"] = rec
            return normalized
        except Exception as e:
            print(f"RAGAS Evaluation Error: {e}")
            return {"error": str(e)}

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
        enable_ragas: bool = False,
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
        
        # Define a prompt template that encourages reasoning.
        # In LangChain 1.x, prompts live in `langchain_core.prompts`.
        from langchain_core.prompts import PromptTemplate
        
        template = """You are a helpful AI assistant. The context below may include:
(1) recent conversation with the user,
(2) similar past Q&A from stored history,
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

        # Always build generation context manually so short-term / long-term memory can be injected.
        retrieved_text = "\n\n".join([doc.page_content for doc in source_documents])
        memory_prefix = self._build_memory_prefix(chat_history, long_term_memory)
        if memory_prefix:
            context_text = memory_prefix + "\n\n---\n\nRetrieved documents:\n" + retrieved_text
        else:
            context_text = retrieved_text

        prompt_text = PROMPT.format(context=context_text, question=question)
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
        
        # `result` 介面在 multi-query 分支下可能不會包含 `source_documents`，
        # 這裡直接使用我們上面已經計算好的 `source_documents`。
        contexts = [doc.page_content for doc in source_documents]
        
        # RAGAS Evaluation (Optional, can be slow)
        ragas_eval = None
        if enable_ragas:
            ragas_eval = self.evaluate_response(question, answer, contexts)

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
                "duration": round(duration, 2),
                "ragas": ragas_eval
            }
        }

    def query_stream(
        self,
        question: str,
        enable_ragas: bool = False,
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

        from langchain_core.prompts import PromptTemplate

        template = """You are a helpful AI assistant. The context below may include:
(1) recent conversation with the user,
(2) similar past Q&A from stored history,
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

        retrieved_text = "\n\n".join([doc.page_content for doc in source_documents])
        memory_prefix = self._build_memory_prefix(chat_history, long_term_memory)
        if memory_prefix:
            context_text = memory_prefix + "\n\n---\n\nRetrieved documents:\n" + retrieved_text
        else:
            context_text = retrieved_text

        prompt_text = PROMPT.format(context=context_text, question=question)

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
                    if content in ans_content or ans_content in content:
                        yield ("answer", content)
                    else:
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

        # RAGAS Evaluation (skip in streaming mode - can be done separately)
        ragas_eval = None
        if enable_ragas:
            ragas_eval = self.evaluate_response(question, answer, contexts)

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
                "duration": round(duration, 2),
                "ragas": ragas_eval
            }
        }

        # Return final result as the last yield
        yield ("final", final_result)

    def list_documents(self):
        """Lists all documents in the current collection using paging to avoid memory/SQL errors."""
        all_sources = set()
        limit = 1000
        offset = 0
        
        while True:
            batch = self.vectorstore.get(include=['metadatas'], limit=limit, offset=offset)
            if not batch or not batch.get('metadatas'):
                break
                
            for meta in batch['metadatas']:
                if meta and 'source' in meta:
                    all_sources.add(os.path.basename(meta['source']))
            
            if len(batch['metadatas']) < limit:
                break
            offset += limit
            
        return sorted(list(all_sources))

    def delete_document(self, source_basename: str):
        """Deletes all chunks associated with a specific document source."""
        # We need to find the full internal path first to use 'where' filter
        full_path = None
        limit = 1000
        offset = 0
        
        # Scan metadatas in pages to find the full path mapping to this basename
        while True:
            batch = self.vectorstore.get(include=['metadatas'], limit=limit, offset=offset)
            if not batch or not batch.get('metadatas'):
                break
                
            for meta in batch['metadatas']:
                if meta and os.path.basename(meta.get('source', '')) == source_basename:
                    full_path = meta['source']
                    break
            
            if full_path or len(batch['metadatas']) < limit:
                break
            offset += limit
            
        if full_path:
            # Use the optimized 'where' filter for deletion
            self.vectorstore.delete(where={"source": full_path})
            return True
        return False

    @staticmethod
    def delete_collection(collection_name: str):
        """Permanently deletes a collection and its contents."""
        import shutil

        collection_name = collection_name.lower()
        persist_directory = os.getenv("PERSIST_DIRECTORY", "./chroma_db")
        import chromadb
        client = chromadb.PersistentClient(path=persist_directory)

        try:
            # Get collection info before deletion to find its UUID
            collection = client.get_collection(name=collection_name)
            collection_uuid = collection.id

            # Delete from ChromaDB (removes from SQLite)
            client.delete_collection(name=collection_name)

            # Also delete the physical directory for this collection
            collection_dir = os.path.join(persist_directory, str(collection_uuid))
            if os.path.exists(collection_dir):
                shutil.rmtree(collection_dir)

            return True
        except Exception as e:
            print(f"Error deleting collection {collection_name}: {e}")
            return False

    @staticmethod
    def rename_collection(old_name: str, new_name: str):
        """Renames a collection."""
        old_name = old_name.lower()
        new_name = new_name.lower()
        persist_directory = os.getenv("PERSIST_DIRECTORY", "./chroma_db")
        import chromadb
        client = chromadb.PersistentClient(path=persist_directory)
        try:
            # ChromaDB's rename_collection is simple:
            collection = client.get_collection(name=old_name)
            collection.modify(name=new_name)
            return True
        except Exception as e:
            print(f"Error renaming collection from {old_name} to {new_name}: {e}")
            return False

    @staticmethod
    def list_collections():
        """Lists all available collections in ChromaDB, excluding internal ones."""
        persist_directory = os.getenv("PERSIST_DIRECTORY", "./chroma_db")
        # Initialize a temporary client to list collections
        import chromadb
        client = chromadb.PersistentClient(path=persist_directory)
        
        collections = []
        for c in client.list_collections():
            # Filter out test collections and the default 'langchain' if it's empty
            if c.name.startswith("test_collection_"):
                continue
            if c.name == "langchain" and c.count() == 0:
                continue
            collections.append(c.name)
        return sorted(collections)

    @staticmethod
    def validate_collection_name(name: str):
        """Validates if a collection name follows ChromaDB rules."""
        import re
        name = name.lower() # Auto-lowercase for validation
        if not (3 <= len(name) <= 63):
            return False, "Name must be between 3 and 63 characters."
        if not re.match(r"^[a-z0-9][a-z0-9._-]*[a-z0-9]$", name):
            return False, "Name must contain only lowercase letters, digits, dots, underscores, or hyphens."
        if ".." in name:
            return False, "Name cannot contain consecutive dots."
        return True, ""

    @staticmethod
    def create_collection(collection_name: str):
        """Explicitly creates a collection in ChromaDB."""
        collection_name = collection_name.lower() # Ensure lowercase
        valid, msg = RAGEngine.validate_collection_name(collection_name)
        if not valid:
            return False, msg
            
        persist_directory = os.getenv("PERSIST_DIRECTORY", "./chroma_db")
        import chromadb
        client = chromadb.PersistentClient(path=persist_directory)
        try:
            client.create_collection(name=collection_name)
            return True, "Collection created successfully."
        except Exception as e:
            if "already exists" in str(e).lower():
                return True, f"Collection '{collection_name}' already exists."
            return False, f"Error creating collection: {e}"
