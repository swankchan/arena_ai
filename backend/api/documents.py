"""Document upload, ingestion-job, listing, and deletion endpoints."""

from typing import List

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)

from backend.lance_store import LanceStore
from backend.services import collections
from backend.services.collections import normalize_name, table_name
from backend.services.documents import process_saved_documents, save_uploads


router = APIRouter(prefix="/api", tags=["documents"])


def _require_collection(name: str) -> str:
    try:
        normalized = normalize_name(name)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if normalized not in collections.list_collections():
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Collection '{normalized}' does not exist.",
        )
    return normalized


@router.get("/collections/{collection_name}/documents")
def list_documents(collection_name: str):
    normalized = _require_collection(collection_name)
    sources = LanceStore.list_table_documents(table_name(normalized))
    return {"documents": [
        {"source": source, "name": source.replace("\\", "/").rsplit("/", 1)[-1]}
        for source in sources
    ]}


@router.delete("/collections/{collection_name}/documents")
def delete_document(collection_name: str, source: str):
    normalized = _require_collection(collection_name)
    deleted = LanceStore.delete_table_document(table_name(normalized), source)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return {"source": source, "deleted_chunks": deleted}


@router.post(
    "/collections/{collection_name}/documents",
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_documents(
    collection_name: str,
    request: Request,
    files: List[UploadFile] = File(...),
):
    normalized = _require_collection(collection_name)
    try:
        paths = await save_uploads(normalized, files)
    except OverflowError as exc:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    engines = request.app.state.engines

    def worker(progress):
        engine = engines.get_engine(normalized)
        return process_saved_documents(engine, paths, progress)

    job = request.app.state.jobs.submit(
        normalized,
        [path.name for path in paths],
        worker,
    )
    return job


@router.get("/jobs/{job_id}")
def get_job(job_id: str, request: Request):
    job = request.app.state.jobs.get(job_id)
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found.")
    return job
