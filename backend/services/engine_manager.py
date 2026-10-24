"""Lazy, process-local RAG engine cache.

Heavy model packages are imported only when an endpoint actually needs them,
so collection management and the built frontend can start without model loads.
"""

import threading
from typing import Dict


class EngineManager:
    def __init__(self):
        self._lock = threading.RLock()
        self._engines: Dict[str, object] = {}
        self._embeddings = None
        self._llm = None

    def _get_embeddings(self):
        if self._embeddings is None:
            with self._lock:
                if self._embeddings is None:
                    from backend.embeddings import create_embeddings

                    self._embeddings = create_embeddings()
        return self._embeddings

    def _get_llm(self):
        if self._llm is None:
            with self._lock:
                if self._llm is None:
                    from backend.llm_config import create_llm

                    self._llm = create_llm()
        return self._llm

    def get_engine(self, collection_name: str):
        with self._lock:
            engine = self._engines.get(collection_name)
            if engine is not None:
                return engine

            # This import intentionally remains lazy: it pulls in document
            # loaders, pandas, tokenizers, and the LangChain provider clients.
            from backend.rag_engine import RAGEngine

            engine = RAGEngine(
                collection_name=collection_name,
                embeddings=self._get_embeddings(),
                llm=self._get_llm(),
            )
            self._engines[collection_name] = engine
            return engine

    def invalidate(self, collection_name: str) -> None:
        with self._lock:
            self._engines.pop(collection_name, None)

    def clear(self) -> None:
        with self._lock:
            self._engines.clear()
