"""Runtime configuration for the decoupled FastAPI application."""

import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

from backend.embeddings import get_embedding_dimensions, get_embedding_model_name


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SUPPORTED_EXTENSIONS = frozenset({
    "html", "htm", "pdf", "csv", "txt", "xlsx", "xls", "docx", "doc",
})

load_dotenv(override=True)


def get_documents_dir() -> Path:
    return Path(os.getenv("DOCUMENTS_DIRECTORY", "./documents")).expanduser()


def get_frontend_dist() -> Path:
    configured = os.getenv("FRONTEND_DIST")
    return Path(configured).expanduser() if configured else PROJECT_ROOT / "frontend" / "dist"


def get_cors_origins() -> List[str]:
    configured = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


def get_max_upload_bytes() -> int:
    return int(os.getenv("MAX_UPLOAD_SIZE_MB", "50")) * 1024 * 1024


def get_max_sql_rows() -> int:
    return max(1, int(os.getenv("MAX_SQL_ROWS", "1000")))


def get_ingestion_workers() -> int:
    return max(1, int(os.getenv("INGESTION_WORKERS", "1")))


def get_engine_key(collection_name: str) -> str:
    """Record the effective engine settings with each Q&A run."""
    return "|".join([
        f"collection={collection_name}",
        f"embed={get_embedding_model_name()}",
        f"embedding_dims={get_embedding_dimensions()}",
        f"llm=llama.cpp:{os.getenv('LLAMA_CPP_MODEL', 'local-model')}",
        f"base_url={os.getenv('LLAMA_CPP_BASE_URL', 'http://localhost:8080/v1')}",
        f"vector_db={os.getenv('LANCEDB_PATH', './lance_db')}",
        f"documents={get_documents_dir()}",
        f"chunk_size={os.getenv('CHUNK_SIZE', '1000')}",
        f"chunk_overlap={os.getenv('CHUNK_OVERLAP', '100')}",
        f"chunking={os.getenv('CHUNKING_STRATEGY', 'recursive').lower()}",
        f"reranking={os.getenv('RERANKING', 'false').lower()}",
    ])
