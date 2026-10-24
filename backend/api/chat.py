"""Server-sent-event chat streaming and server-side persistence."""

import json
import logging
import ntpath
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from backend import db
from backend.config import get_engine_key
from backend.embeddings import embed_similarity_query
from backend.schemas import ChatRequest
from backend.services import collections
from backend.services.collections import normalize_name
from backend.services.smalltalk import is_smalltalk, stream_smalltalk
from backend.services.telemetry import LiveMetricsMeter

router = APIRouter(prefix="/api/collections", tags=["chat"])
logger = logging.getLogger(__name__)


def _event(event: str, data: Any) -> str:
    payload = json.dumps(data, ensure_ascii=False, default=str)
    return f"event: {event}\ndata: {payload}\n\n"


def _sources(raw_sources) -> list[str]:
    sources = []
    for source in raw_sources or []:
        if not source or source == "Unknown":
            continue
        name = ntpath.basename(str(source))
        if name and name not in sources:
            sources.append(name)
    return sources


@router.post("/{collection_name}/chat")
def chat(collection_name: str, payload: ChatRequest, request: Request):
    try:
        normalized = normalize_name(collection_name)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if normalized not in collections.list_collections():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Collection not found.")

    if payload.conversation_id:
        conversation = db.get_conversation_by_id(payload.conversation_id)
        if not conversation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
        if conversation["collection_name"] != normalized:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Conversation belongs to another collection.")
        conversation_id = payload.conversation_id
    else:
        conversation_id = db.create_conversation(normalized)

    route = "smalltalk" if is_smalltalk(payload.question) else "rag"
    # Social replies never receive conversation history. Uncertain messages
    # always use the existing grounded RAG pipeline.
    history = (
        None
        if route == "smalltalk"
        else db.get_conversation_messages(conversation_id)
    )
    db.insert_message(conversation_id, "user", payload.question)
    engines = request.app.state.engines

    def stream():
        final_result = None
        try:
            yield _event("meta", {"conversation_id": conversation_id})
            if route == "smalltalk":
                events = stream_smalltalk(engines.get_llm(), payload.question)
            else:
                engine = engines.get_engine(normalized)
                events = engine.query_stream(
                    payload.question,
                    chat_history=history or None,
                    query_transformation=payload.query_transformation,
                    query_expansion=payload.query_expansion,
                )

            live_metrics = LiveMetricsMeter()
            for phase, content in events:
                if phase == "final":
                    final_result = content
                    break
                if phase in {"reasoning", "answer"}:
                    yield _event(phase, {"text": content})
                    metrics_update = live_metrics.add_text(str(content))
                    if metrics_update is not None:
                        yield _event("metrics", metrics_update)

            if final_result is None:
                raise RuntimeError("The response stream ended without a final result.")

            answer = final_result.get("answer", "")
            metrics = final_result.get("metrics", {})
            sources = _sources(final_result.get("sources"))
            qa_run_id = None
            persistence_error = None
            try:
                if route == "smalltalk":
                    # Keep the thread, but do not pollute document Q&A history,
                    # ratings, or embedding-based long-term memory.
                    db.insert_message(conversation_id, "assistant", answer)
                else:
                    try:
                        question_embedding = embed_similarity_query(
                            engine.embeddings,
                            payload.question,
                        )
                    except Exception:
                        question_embedding = None
                    qa_run_id = db.insert_qa_run(
                        conversation_id,
                        normalized,
                        payload.question,
                        answer,
                        sources,
                        metrics,
                        final_result.get("optimization_log", ""),
                        get_engine_key(normalized),
                        question_embedding,
                    )
                    db.insert_message(
                        conversation_id,
                        "assistant",
                        answer,
                        qa_run_id=qa_run_id,
                    )
            except Exception as exc:
                logger.exception("Could not persist chat response")
                persistence_error = str(exc)

            yield _event("final", {
                "conversation_id": conversation_id,
                "qa_run_id": qa_run_id,
                "answer": answer,
                "reasoning": final_result.get("reasoning", ""),
                "optimization_log": final_result.get("optimization_log", ""),
                "sources": sources,
                "metrics": metrics,
                "route": route,
                "persistence_error": persistence_error,
            })
        except Exception as exc:
            logger.exception("Chat stream failed")
            yield _event("error", {"detail": str(exc)})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Conversation-ID": conversation_id,
        },
    )
