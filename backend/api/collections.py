"""Collection CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Request, Response, status

from backend.schemas import CollectionCreate, CollectionDelete, CollectionRename
from backend.services import collections


router = APIRouter(prefix="/api/collections", tags=["collections"])


def _raise_service_error(exc: Exception):
    if isinstance(exc, FileNotFoundError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    if isinstance(exc, FileExistsError):
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    if isinstance(exc, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc


@router.get("")
def list_collections():
    return {"collections": collections.list_collections()}


@router.post("")
def create_collection(payload: CollectionCreate, response: Response):
    try:
        created, name = collections.create_collection(payload.name)
    except Exception as exc:
        _raise_service_error(exc)
    response.status_code = (
        status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )
    return {"name": name, "created": created}


@router.patch("/{collection_name}")
def rename_collection(
    collection_name: str,
    payload: CollectionRename,
    request: Request,
):
    if request.app.state.jobs.has_active(collection_name):
        raise HTTPException(status.HTTP_409_CONFLICT, "Wait for ingestion to finish.")
    try:
        renamed = collections.rename_collection(
            collection_name,
            payload.new_name,
        )
    except Exception as exc:
        _raise_service_error(exc)
    request.app.state.engines.invalidate(collection_name.lower())
    request.app.state.engines.invalidate(renamed)
    return {"name": renamed}


@router.delete("/{collection_name}")
def delete_collection(
    collection_name: str,
    payload: CollectionDelete,
    request: Request,
):
    normalized = collection_name.strip().lower()
    if payload.confirmation != normalized:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Type the exact collection name to confirm deletion.",
        )
    if request.app.state.jobs.has_active(normalized):
        raise HTTPException(status.HTTP_409_CONFLICT, "Wait for ingestion to finish.")
    try:
        collections.delete_collection(normalized)
    except Exception as exc:
        _raise_service_error(exc)
    request.app.state.engines.invalidate(normalized)
    return {"deleted": normalized}
