"""FastAPI entry point for the decoupled RAG application."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend import db
from backend.api import chat, collections, conversations, documents, prompts, system, tabular
from backend.config import get_cors_origins, get_frontend_dist
from backend.services.engine_manager import EngineManager
from backend.services.jobs import JobManager


API_ROUTERS = (
    system.router,
    collections.router,
    documents.router,
    conversations.router,
    chat.router,
    prompts.router,
    tabular.router,
)


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        db.init_db()
        yield
        app.state.jobs.shutdown()

    application = FastAPI(
        title="RAG Knowledge Base API",
        description="Decoupled API for LanceDB retrieval and llama.cpp generation.",
        lifespan=lifespan,
    )
    application.state.engines = EngineManager()
    application.state.jobs = JobManager()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
        expose_headers=["X-Conversation-ID"],
    )
    for router in API_ROUTERS:
        application.include_router(router)

    frontend_dist = get_frontend_dist()
    assets = frontend_dist / "assets"
    if assets.is_dir():
        application.mount(
            "/assets",
            StaticFiles(directory=assets),
            name="frontend-assets",
        )

    @application.get("/", include_in_schema=False)
    def frontend_index():
        return _frontend_file(frontend_dist, "index.html")

    @application.get("/{full_path:path}", include_in_schema=False)
    def frontend_fallback(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found.")
        candidate = (frontend_dist / full_path).resolve()
        root = frontend_dist.resolve()
        if candidate.is_file() and root in candidate.parents:
            return FileResponse(candidate)
        return _frontend_file(frontend_dist, "index.html")

    return application


def _frontend_file(frontend_dist: Path, filename: str):
    path = frontend_dist / filename
    if not path.is_file():
        raise HTTPException(
            status_code=503,
            detail="Frontend build not found. Run 'npm run build' in frontend/.",
        )
    return FileResponse(path)


app = create_app()
