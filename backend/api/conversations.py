"""Conversation, Q&A-history, and rating endpoints."""

import json

from fastapi import APIRouter, HTTPException, Query, status

from backend import db
from backend.schemas import ConversationCreate, RatingRequest
from backend.services import collections
from backend.services.collections import normalize_name


router = APIRouter(prefix="/api", tags=["conversations"])


def _collection(name: str) -> str:
    try:
        normalized = normalize_name(name)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if normalized not in collections.list_collections():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Collection not found.")
    return normalized


def _conversation(conversation_id: str):
    conversation = db.get_conversation_by_id(conversation_id)
    if not conversation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    return conversation


def _public_qa(item: dict) -> dict:
    result = dict(item)
    result.pop("question_embedding", None)
    for source, target in [
        ("sources_json", "sources"),
        ("metrics_json", "metrics"),
    ]:
        if source in result:
            try:
                result[target] = json.loads(result.pop(source) or ("[]" if source == "sources_json" else "{}"))
            except json.JSONDecodeError:
                result[target] = [] if source == "sources_json" else {}
    with db.get_db_connection() as conn:
        rating = conn.execute(
            "SELECT rating, comment, created_at FROM ratings WHERE qa_run_id = ?",
            (result["id"],),
        ).fetchone()
    result["rating"] = dict(rating) if rating else None
    return result


@router.get("/collections/{collection_name}/conversations")
def list_conversations(collection_name: str):
    normalized = _collection(collection_name)
    return {"conversations": db.list_conversations(normalized)}


@router.post(
    "/collections/{collection_name}/conversations",
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(collection_name: str, payload: ConversationCreate):
    normalized = _collection(collection_name)
    conversation_id = db.create_conversation(normalized, name=payload.name)
    return db.get_conversation_by_id(conversation_id)


@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: str):
    _conversation(conversation_id)
    return {"messages": db.get_conversation_messages(conversation_id)}


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    _conversation(conversation_id)
    db.delete_conversation(conversation_id)
    return {"deleted": conversation_id}


@router.get("/collections/{collection_name}/qa-runs")
def list_qa_runs(
    collection_name: str,
    limit: int = Query(default=25, ge=1, le=100),
):
    normalized = _collection(collection_name)
    return {"qa_runs": db.list_recent_qa_runs(normalized, limit=limit)}


@router.get("/qa-runs/{qa_run_id}")
def get_qa_run(qa_run_id: int):
    item = db.get_qa_run(qa_run_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Q&A run not found.")
    return _public_qa(item)


@router.delete("/qa-runs/{qa_run_id}")
def delete_qa_run(qa_run_id: int):
    if not db.get_qa_run(qa_run_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Q&A run not found.")
    db.delete_qa_run(qa_run_id)
    return {"deleted": qa_run_id}


@router.put("/qa-runs/{qa_run_id}/rating")
def rate_qa_run(qa_run_id: int, payload: RatingRequest):
    if not db.get_qa_run(qa_run_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Q&A run not found.")
    db.upsert_rating(qa_run_id, payload.rating, payload.comment)
    return {"qa_run_id": qa_run_id, "rating": payload.rating}
