"""Natural-language and read-only direct SQL endpoints."""

from fastapi import APIRouter, HTTPException, Request, status

from backend.schemas import NaturalLanguageQueryRequest, SQLQueryRequest
from backend.services import collections, tabular
from backend.services.collections import normalize_name


router = APIRouter(prefix="/api/collections", tags=["tabular"])


def _collection(name: str) -> str:
    try:
        normalized = normalize_name(name)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if normalized not in collections.list_collections():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Collection not found.")
    return normalized


def _file(collection_name: str, file_id: int):
    item = tabular.get_file(collection_name, file_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tabular file not found.")
    return item


@router.get("/{collection_name}/tabular/files")
def list_tabular_files(collection_name: str):
    normalized = _collection(collection_name)
    return {"files": tabular.list_files(normalized)}


@router.delete("/{collection_name}/tabular/files/{file_id}")
def delete_tabular_file(collection_name: str, file_id: int):
    normalized = _collection(collection_name)
    if not tabular.delete_file(normalized, file_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tabular file not found.")
    return {"deleted": file_id}


@router.post("/{collection_name}/tabular/query")
def query_tabular(collection_name: str, payload: SQLQueryRequest):
    normalized = _collection(collection_name)
    item = _file(normalized, payload.file_id)
    try:
        return tabular.execute_sql(item, payload.query)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc


@router.post("/{collection_name}/tabular/query/natural")
def query_tabular_natural(
    collection_name: str,
    payload: NaturalLanguageQueryRequest,
    request: Request,
):
    normalized = _collection(collection_name)
    _file(normalized, payload.file_id)
    try:
        engine = request.app.state.engines.get_engine(normalized)
        result = engine.query_tabular_sql(
            payload.question,
            file_id=payload.file_id,
        )
        rows = result.get("rows", result.get("results", []))
        if not isinstance(rows, list):
            rows = []
        result["rows"] = rows
        result["row_count"] = result.get(
            "row_count",
            result.get("results_count", len(rows)),
        )
        result["columns"] = result.get(
            "columns",
            list(rows[0].keys()) if rows and isinstance(rows[0], dict) else [],
        )
        return result
    except Exception as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc
