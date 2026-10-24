"""Health and public runtime configuration."""

import os

from fastapi import APIRouter

from backend.config import SUPPORTED_EXTENSIONS, get_max_upload_bytes
from backend.embeddings import (
    get_embedding_dimensions,
    get_embedding_model_name,
)
from backend.llm_config import check_llm_connection, get_llm_config

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/health/llm")
async def llm_health():
    return {"connected": await check_llm_connection()}


@router.get("/config")
def public_config():
    llm = get_llm_config()
    return {
        "supported_extensions": sorted(SUPPORTED_EXTENSIONS),
        "max_upload_size_mb": get_max_upload_bytes() // (1024 * 1024),
        "embedding_model": get_embedding_model_name(),
        "embedding_dimensions": get_embedding_dimensions(),
        "chunking_strategy": os.getenv("CHUNKING_STRATEGY", "recursive"),
        "chunk_size": int(os.getenv("CHUNK_SIZE", "1000")),
        "chunk_overlap": int(os.getenv("CHUNK_OVERLAP", "100")),
        "reranking": os.getenv("RERANKING", "false").lower() == "true",
        "rerank_model": os.getenv(
            "RERANK_MODEL",
            "ms-marco-MiniLM-L-12-v2",
        ),
        "query_transformation": os.getenv(
            "QUERY_TRANSFORMATION", "false"
        ).lower() == "true",
        "query_expansion": os.getenv(
            "QUERY_EXPANSION", "false"
        ).lower() == "true",
        "llm": {
            "provider": "llama.cpp",
            "model": llm["model"],
            "base_url": llm["base_url"],
        },
    }
