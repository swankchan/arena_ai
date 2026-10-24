# RAG Knowledge Base

A local-first retrieval-augmented generation application with a **React +
TypeScript frontend**, **FastAPI backend**, embedded **LanceDB**, and a local
GGUF model served by **llama.cpp**. No Docker or external vector-database server
is required.

## Features

- Decoupled SPA and JSON/SSE API with an OpenAPI schema.
- Document collections backed by local LanceDB tables.
- PDF, HTML, TXT, and DOCX ingestion into the vector index.
- CSV, XLSX, and XLS ingestion into SQLite for SQL/Pandas analysis.
- Background ingestion jobs with explicit vector/tabular progress and results.
- Exact cosine retrieval with optional FlashRank reranking.
- Task-prompted EmbeddingGemma 2 embeddings with normalized 768d vectors.
- Request-scoped query transformation and expansion.
- Streaming answers, sources, metrics, and conversation memory.
- Guarded smalltalk for common greetings, thanks, and feedback.
- Natural-language and read-only direct SQL analysis for tabular data.
- SQLite conversations, Q&A history, ratings, and system prompts.
- Responsive collection, thread, document, and prompt management.

## Architecture

```text
React SPA ── REST + SSE ── FastAPI ── RAGEngine
                              ├── LanceDB
                              ├── SQLite
                              └── llama.cpp
```

The browser only calls relative `/api` URLs. It never connects directly to
LanceDB, SQLite, or llama.cpp.

| Path | Responsibility |
| --- | --- |
| `backend/main.py` | FastAPI composition, CORS, lifespan, and SPA serving |
| `backend/api/` | Typed HTTP and SSE endpoints |
| `backend/services/` | Engine cache, collection operations, uploads, and jobs |
| `backend/services/ingestion.py` | Explicit vector/tabular dispatch and per-file results |
| `backend/services/content_metadata.py` | Bounded vector excerpts and tabular schemas for summaries |
| `backend/services/smalltalk.py` | Smalltalk router and isolated guard |
| `backend/embeddings.py` | Lazy Gemma loading and task-specific prompts |
| `backend/rag_engine.py` | Vector-only ingestion, retrieval, query optimization, and generation |
| `backend/lance_store.py` | Embedded tables and exact vector search |
| `backend/db.py` | SQLite persistence |
| `backend/tabular_engine.py` | CSV/Excel loading, SQLite storage, Text-to-SQL, and pandas analysis |
| `frontend/` | React, Vite, and TypeScript single-page application |
| `tests/` | Real LanceDB/SQLite API tests with deterministic engines |

Heavy models are loaded lazily only when an endpoint needs them. Collection
management and the built frontend can start without downloading an embedding
model or contacting llama.cpp. Tabular-only uploads construct the SQLite handler
without initializing RAGEngine or EmbeddingGemma; summary generation uses the
shared llama.cpp client when no vector engine was needed.

## Requirements

- Python 3.11 or newer.
- Node.js 22.12 or newer for frontend development and builds.
- A llama.cpp server with a GGUF model.
- Local storage for embedding and reranking models.

Node.js is **not** required in production after `frontend/dist` has been built.

## Quick start

### 1. Install and build

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

cd frontend
npm ci
npm run build
cd ..
```

If you use the existing Conda environment, run `conda activate rag` before
installing the Python dependencies.

### 2. Start llama.cpp

```bash
llama-server \
  -m /path/to/model.gguf \
  --port 8080 \
  --alias local-model
```

Verify the OpenAI-compatible endpoint:

```bash
curl http://localhost:8080/v1/models
```

Set `LLAMA_CPP_MODEL` if you choose another model alias.

### 3. Start the application

For normal use or production, run **one** backend server without auto-reload:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000`. FastAPI serves the React build and API from the
same origin. Interactive API documentation is available at `/docs`.

## Development servers

The development command below is an **alternative** to the normal command
above, not an additional step. Stop the normal server first because both
commands listen on port 8000. The `--reload` option automatically restarts the
backend after Python code changes and is not needed for normal use.

For development only, run the backend and Vite in separate terminals:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to port 8000, while browser
code continues to use relative URLs. Configure `CORS_ORIGINS` if you use a
different frontend origin without the proxy.

## API overview

| Area | Endpoints |
| --- | --- |
| Health/config | `GET /api/health`, `GET /api/health/llm`, `GET /api/config` |
| Collections | `GET/POST /api/collections`; `GET .../{name}/summary`; `PATCH/DELETE` by name |
| Documents | `GET/POST/DELETE /api/collections/{name}/documents` |
| Ingestion jobs | `GET /api/jobs/{id}` |
| Chat | `POST /api/collections/{name}/chat` |
| Conversations | `GET/POST /api/collections/{name}/conversations` |
| Messages | `GET` messages; `DELETE` conversation by ID |
| Q&A/ratings | `/api/collections/{name}/qa-runs`, `/api/qa-runs/{id}` |
| Prompts | `GET/POST /api/prompts`, `PATCH/DELETE /api/prompts/{id}` |
| Tabular | `/api/collections/{name}/tabular/files` and `/tabular/query` |

The topbar Backend and LLM indicators are independent. Backend uses
`/api/health`; LLM health makes a server-side request to the configured
llama.cpp `/models` endpoint with a two-second timeout and returns HTTP 200 with
`{"connected": false}` when unavailable. The browser stays on relative `/api`
URLs, and `LLAMA_CPP_API_KEY` is never sent to the SPA.

Chat uses Server-Sent Events with `meta`, `reasoning`, `answer`, `metrics`,
`final`, and `error` events. During generation, throttled `metrics` events show
a live estimated tokens/s rate at most once every 250 ms. The estimate uses
streamed text and elapsed request time, including query optimization,
retrieval, and other RAG work; it is not provider-reported token usage or a
pure LLM decode benchmark. The existing `final` metrics remain unchanged after
completion. The backend loads conversation history and persists completed
answers; the browser does not supply trusted history.

Document upload returns `202 Accepted` and a job ID. Poll the job endpoint for
queued/running status, progress, and per-file errors. Each job reports
`processed_files`, `vector_files`, `tabular_files`, `total_chunks`, `total_rows`,
and `file_results` with each file's `kind` and status. `total_chunks` counts only
vector documents; `total_rows` counts tabular input. CSV/Excel files are not
also embedded into LanceDB, so a successful tabular file reports its row and
column counts instead of a misleading standalone `0 chunks` result. Jobs are
transient and process-local, so no Redis or external queue is needed.

### Automatic collection descriptions

After a successful upload batch, llama.cpp generates one short sentence describing
the current collection and saves it in SQLite. The description appears below the
collection name in the topbar; there is no manual description field. It is
regenerated after vector-document or tabular-file deletion, preserved across
collection renames, and cleared when no content remains. Existing collections
receive a description after their next successful ingestion.

Generation uses bounded source-diverse document excerpts and tabular schemas,
not the entire collection. `ContentMetadataProvider` isolates those storage
details from summary generation. A summary failure does not roll back indexed
data: the job or deletion response includes `summary_error`, and the last successful
description is retained. `GET /api/collections/{name}/summary` reads the current
metadata without invoking an LLM.

### Smalltalk routing

Short, whole-message allowlisted greetings, thanks, and feedback use a dedicated
system guard with the same llama.cpp model. This path does not initialize the
RAG engine or embeddings, read conversation history, retrieve documents, call
SQL/tools, or create Q&A history and long-term-memory entries. The messages
remain in their conversation thread.

Any additional instructions or uncertain input use the normal RAG path. The
allowlist is deliberately conservative, so unrecognized social phrasing may
still receive a grounded response. Prompt guards are not a substitute for
authentication, authorization, or backend permission checks.

## Configuration

Configuration is loaded from `.env`. Defaults match `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `LLAMA_CPP_BASE_URL` | `http://localhost:8080/v1` | llama.cpp API base URL |
| `LLAMA_CPP_MODEL` | `local-model` | Model alias sent in API requests |
| `LLAMA_CPP_API_KEY` | `not-needed` | Placeholder or configured server key |
| `EMBEDDING_MODEL` | `google/embeddinggemma-2` | Hugging Face embedding model |
| `EMBEDDING_DIMS` | `768` | Native size; MRL also supports 512, 256, 128 |
| `EMBEDDING_BATCH_SIZE` | `32` | Texts encoded per model batch |
| `EMBEDDING_TEXT_ONLY` | `true` | Skip unused vision/audio encoders |
| `EMBEDDING_DEVICE` | Auto | Optional `cpu`, `cuda`, `cuda:0`, or `mps` |
| `LANCEDB_PATH` | `./lance_db` | Embedded vector-store directory |
| `CHUNK_SIZE` | `1000` | Recursive chunk size |
| `CHUNK_OVERLAP` | `100` | Recursive chunk overlap |
| `CHUNKING_STRATEGY` | `recursive` | `recursive` or `semantic` |
| `TOP_K` | `4` | Retrieved result count |
| `RERANKING` | `true` | Enable FlashRank reranking |
| `RERANK_MODEL` | `ms-marco-MiniLM-L-12-v2` | FlashRank model |
| `QUERY_TRANSFORMATION` | `true` | Default query clarification setting |
| `QUERY_EXPANSION` | `true` | Default query expansion setting |
| `LONG_TERM_MEMORY_TOP_K` | `3` | Past Q&A memory limit |
| `CHAT_HISTORY_MAX_MESSAGES` | `12` | Short-term history message limit |
| `CHAT_HISTORY_MAX_CHARS_PER_MESSAGE` | `2000` | Per-message history limit |
| `DOCUMENTS_DIRECTORY` | `./documents` | Upload and tabular-data root |
| `APP_DB_PATH` | `./rag_app.db` | Application SQLite database |
| `FRONTEND_DIST` | `./frontend/dist` | Production SPA build directory |
| `CORS_ORIGINS` | Local Vite origins | Comma-separated allowed origins |
| `MAX_UPLOAD_SIZE_MB` | `50` | Per-file upload limit |
| `MAX_SQL_ROWS` | `1000` | Direct SQL result-row limit |
| `INGESTION_WORKERS` | `1` | Process-local ingestion worker count |

`LLAMA_CPP_BASE_URL` must include `/v1`, not `/chat/completions`. The placeholder
API key only satisfies the client when llama.cpp authentication is disabled.
No API key is exposed through the public configuration endpoint.

## EmbeddingGemma 2

The default model is `google/embeddinggemma-2`. The first embedding request
downloads it from Hugging Face unless it is already cached. The dependency
file requires Sentence Transformers 6.1 or newer and Transformers 5.18 or
newer.

Retrieval uses the model's asymmetric `SearchQuery` and `Document` prompts.
Documents currently use the built-in untitled-document form. Semantic chunking
and question-to-question memory use `SentenceSimilarity` instead. All three
paths share one lazily loaded model and produce normalized vectors.

The current application ingests text, so `EMBEDDING_TEXT_ONLY=true` skips the
vision and audio encoders and loads the 270M-parameter text encoder instead of
the full 740M-parameter model. Supported CUDA devices use bfloat16; other
devices use float32. Float16 is not compatible with this model.

The native vector size is 768. For lower storage usage, `EMBEDDING_DIMS` also
accepts the MRL sizes 512, 256, and 128. Queries and documents always use the
same configured size and are normalized after truncation.

### Re-ingesting existing collections

Changing the model does not migrate existing vectors. In particular, old BGE
collections contain 1024d vectors and cannot be searched with 768d Gemma
vectors. LanceDB rejects that dimension mismatch rather than silently mixing
them. Vector spaces from different models are incompatible even when their
dimensions happen to match.

1. Keep the original documents and the old collection until verification.
2. Configure the new model and dimension, then restart the API process.
3. Create a new collection and upload the original documents again.
4. Verify retrieval, then remove or rename collections as needed.

There is no automatic vector migration or destructive upgrade. Conversation
text and ratings remain in SQLite, but old embedding-based Q&A memory vectors
are not recomputed.

## Local data and deployment

- Uploads are stored in `documents/<collection>/`.
- Tabular SQLite databases live below each collection's `tabular/` directory.
- LanceDB tables live below `LANCEDB_PATH` with the `rag_` prefix.
- Application state uses `APP_DB_PATH`.
- Existing vector and SQLite paths are unchanged by the frontend/backend split.

The current application is a local, single-user, single-node deployment. It
has no authentication layer. Add authentication and transport security before
exposing it to an untrusted network. Do not run multiple API replicas against
the same local LanceDB files, and use one Uvicorn worker for the in-process job
runner.

Local documents, LanceDB tables, databases, model files, logs, frontend builds,
and environment files are excluded from Git.

## Retrieval behavior

Searches explicitly bypass vector indexes and use exact cosine kNN. This
preserves predictable ranking rather than silently enabling quantized ANN.
Query cost grows with the number of chunks; benchmark before adding an
approximate index to a large corpus.

When query transformation is enabled, bounded server-side conversation history
helps rewrite follow-up questions into standalone retrieval queries in the same
LLM call. The original question remains unchanged for generation and
persistence. Disabling transformation also disables this rewriting; failed or
empty rewrites fall back to the original question.

Expanded queries retain deterministic order. Multi-query result lists are fused
with reciprocal rank fusion (RRF) using stable LanceDB chunk IDs, while the
final context remains capped at `2 * TOP_K`. Existing per-query FlashRank
reranking is unchanged.

## Migrating from Elasticsearch

Old Elasticsearch indices are not converted automatically. Reprocess original
uploads to build LanceDB tables. The Elasticsearch service and its Python
packages are no longer required.

## Development and validation

```bash
python -m unittest discover -s tests -v
python -m compileall -q backend tests

cd frontend
npm test
npm run build
cd ..

git diff --check
```

Backend tests use temporary LanceDB/SQLite directories and deterministic fake
model clients. They cover collection/document CRUD, SSE chat, persistence,
ratings, prompts, upload validation, explicit vector/tabular jobs, lazy
vector-engine dispatch, real CSV-to-SQLite ingestion, read-only SQL, SPA
fallback, Gemma task prompts, safe precision, MRL validation, old-collection
dimension protection, RRF ordering, history-aware follow-up retrieval, and smalltalk
injection fallback. No model download, Docker, or llama.cpp server is needed
for these tests.

See [CLAUDE.md](CLAUDE.md) for implementation conventions.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
