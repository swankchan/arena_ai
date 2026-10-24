"""System-prompt management with protection for collection_guard."""

import sqlite3

from fastapi import APIRouter, HTTPException, status

from backend import db
from backend.schemas import PromptCreate, PromptUpdate


router = APIRouter(prefix="/api/prompts", tags=["prompts"])


def _public(prompt: dict) -> dict:
    result = dict(prompt)
    result["enabled"] = (
        True
        if result["name"] == "collection_guard"
        else not bool(result.get("is_default", 0))
    )
    result.pop("is_default", None)
    return result


def _get(prompt_id: int):
    with db.get_db_connection() as conn:
        row = conn.execute(
            "SELECT * FROM system_prompts WHERE id = ?",
            (prompt_id,),
        ).fetchone()
    return dict(row) if row else None


@router.get("")
def list_prompts():
    return {"prompts": [_public(item) for item in db.list_system_prompts()]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_prompt(payload: PromptCreate):
    try:
        prompt_id = db.insert_system_prompt(
            payload.name,
            payload.content,
            is_default=not payload.enabled,
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Prompt name already exists.") from exc
    return _public(_get(prompt_id))


@router.patch("/{prompt_id}")
def update_prompt(prompt_id: int, payload: PromptUpdate):
    prompt = _get(prompt_id)
    if not prompt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prompt not found.")
    if prompt["name"] == "collection_guard" and not payload.enabled:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "collection_guard is always enabled.",
        )
    if prompt["name"] != "collection_guard":
        db.update_system_prompt(prompt_id, is_default=not payload.enabled)
    return _public(_get(prompt_id))


@router.delete("/{prompt_id}")
def delete_prompt(prompt_id: int):
    prompt = _get(prompt_id)
    if not prompt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prompt not found.")
    if prompt["name"] == "collection_guard":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "collection_guard cannot be deleted.",
        )
    if not db.delete_system_prompt(prompt_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Prompt cannot be deleted.")
    return {"deleted": prompt_id}
