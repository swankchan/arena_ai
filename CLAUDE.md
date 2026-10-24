# CLAUDE.md

Repository-specific guidance for coding agents. User-facing setup is in
[README.md](README.md).

## Working environment

The original Python environment is Conda environment `rag` with Python 3.11 or
newer. Frontend development requires Node.js 22.12 or newer:

```bash
conda activate rag
cd frontend && npm ci && cd ..
```

## Run the application

Start llama.cpp when generation is needed. LanceDB is embedded and needs no
separate process:

```bash
llama-server -m /path/to/model.gguf --port 8080 --alias local-model
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

For frontend hot reload, run Vite separately:

```bash
cd frontend && npm run dev
```

Vite proxies `/api` to port 8000. Production requires only FastAPI and
llama.cpp after `npm run build`; it does not need a Node server.

## Architecture

| Path | Purpose |
| --- | --- |
| `backend/main.py` | FastAPI factory, middleware, lifespan, SPA fallback |
| `backend/api/` | Collection, document, chat, history, prompt, SQL routes |
| `backend/schemas.py` | Pydantic request contracts |
| `backend/services/engine_manager.py` | Lazy model and engine cache |
| `backend/services/jobs.py` | In-process ingestion jobs |
| `backend/embeddings.py` | Lazy embedding factory and task prompts |
| `backend/rag_engine.py` | RAG orchestration and Text-to-SQL |
| `backend/lance_store.py` | Embedded vector persistence and exact retrieval |
| `backend/db.py` | Conversations, messages, Q&A, ratings, and prompts |
| `frontend/src/api.ts` | Relative-URL API client and SSE entry point |
| `frontend/src/components/` | Independent React workspaces |

The query pipeline is:

1. Validate the collection and server-side conversation.
2. Load history from SQLite and persist the user message.
3. Transform/expand with request-scoped options.
4. Retrieve exact cosine vectors and optionally rerank.
5. Add tabular results, memory, and system prompts.
6. Stream llama.cpp output over SSE and persist the final answer/Q&A run.

## Repository conventions

### Frontend/backend boundary

- Browser code must use relative `/api` URLs, never `localhost` or `127.0.0.1`.
- Only the Vite server-side proxy may target the backend loopback address.
- Keep request types in `backend/schemas.py` and frontend types in `types.ts`
  aligned. OpenAPI is available at `/openapi.json` and `/docs`.
- Do not expose LanceDB, SQLite, model files, or llama.cpp directly to the SPA.
- Production SPA files come from `FRONTEND_DIST`; API routes take precedence
  over the fallback.
- Vite `allowedHosts` supports remote previews. Do not add a production host
  allowlist that rejects the preview hostname.

### API and streaming

- Chat uses SSE, not WebSocket. Events are `meta`, `reasoning`, `answer`,
  `final`, and `error`; each data payload is JSON.
- Query transformation and expansion are per-request arguments. Never mutate
  `os.environ` to change one user's options.
- Persist chat through the backend, not a browser-controlled history payload.
- Upload returns `202` and a transient job ID. Poll `/api/jobs/{id}` for status.
- Keep model imports lazy so health, static files, and collection CRUD can run
  without downloading models.
- Use one Uvicorn worker with the process-local engine cache and job manager.

### LLM access

- Create every chat model through `backend.llm_config.create_llm()`.
- The only LLM backend is llama.cpp's OpenAI-compatible API.
- `langchain-openai` is a client, not hosted OpenAI inference.
- The default base URL is `http://localhost:8080/v1` and the default alias is
  `local-model`.
- Do not reintroduce provider-specific branches or hosted model names.
- Never expose `LLAMA_CPP_API_KEY` through `/api/config` or frontend code.

### Collections and storage

- Collection `example` uses LanceDB table `rag_example`.
- Embedded tables live below `LANCEDB_PATH`, default `./lance_db`.
- Uploads live below `DOCUMENTS_DIRECTORY`, default `./documents`.
- Tabular databases live in `<documents>/<collection>/tabular/`.
- Application records use `APP_DB_PATH`.
- Document deletion uses exact `source` metadata with SQL-literal escaping.
- Collection rename moves vectors, uploads, SQLite records, and tabular paths.
- SQLite enables foreign keys on every connection and uses
  `check_same_thread=False` for FastAPI threadpool compatibility.

### LanceDB implementation

- Tables store text, source, fixed-size vector, JSON metadata, and timestamps.
- Empty collections use an explicit PyArrow schema.
- Searches call `bypass_vector_index()` for exact cosine kNN. Do not silently
  enable approximate retrieval.
- LangChain retrieval uses the custom `BaseRetriever` adapter.
- FlashRank retrieves `2 * TOP_K` candidates when enabled.
- Source listing/deletion can operate without initializing embeddings.
- OSS rename streams Arrow batches to a new table, verifies row counts, then
  drops the old table without recomputing embeddings.
- Embedded storage is single-node; do not share local tables across replicas.

### Uploads and tabular data

- Allow only documented extensions and reject path separators, empty files,
  duplicate upload names, and files above `MAX_UPLOAD_SIZE_MB`.
- Write uploads to temporary files before replacing existing documents.
- Direct SQL is read-only, limited to `MAX_SQL_ROWS`, and constrained to the
  selected collection's tabular directory.
- Natural-language SQL must receive the selected `file_id`.

### Models, prompts, and memory

- Generation uses llama.cpp; embeddings default to
  `google/embeddinggemma-2` with 768 dimensions.
- Construct embeddings through `backend.embeddings.create_embeddings()`. Keep
  Sentence Transformers and PyTorch imports lazy.
- Gemma retrieval uses `SearchQuery`/`Document`; semantic chunking and Q&A
  memory use `SentenceSimilarity`. Always normalize after MRL truncation.
- Supported Gemma MRL dimensions are 768, 512, 256, and 128. Empty-table
  creation validates `EMBEDDING_DIMS` before writing a schema.
- Default to the 270M text-only encoder. Use bfloat16 only on supported CUDA
  hardware and float32 otherwise; never use float16 for EmbeddingGemma 2.
- Existing BGE 1024d collections are incompatible. Require recreation and
  re-ingestion; never bypass dimension checks or mix embedding vector spaces.
- Chunking is `recursive` or `semantic`; reranking uses FlashRank.
- `collection_guard` is always active and cannot be disabled or deleted.
- Enabled custom prompts are appended to `collection_guard`.
- Short-term memory is bounded by `CHAT_HISTORY_MAX_MESSAGES`.

## Configuration

Copy `.env.example` to `.env`. Keep defaults consistent across the example,
README, and runtime helpers.

Do not commit `.env`, uploads, LanceDB tables, SQLite databases, model files,
logs, `node_modules`, or `frontend/dist`.

## Validation

Run all backend and frontend checks after making changes:

```bash
python -m unittest discover -s tests -v
python -m compileall -q backend tests
cd frontend && npm test && npm run build && cd ..
git diff --check
```

Backend tests use real temporary LanceDB/SQLite stores, a fake engine, and a
fake Sentence Transformer. They need no external service, model download, or
Docker. Embedding tests must cover task prompts, normalization flags, safe
precision, MRL dimensions, and old-table mismatch protection. Frontend tests
cover SSE chunk parsing and formatting; the production build also checks
TypeScript.

When changing retrieval, test empty tables, persistence, source deletion,
rename, and dimension mismatches. When changing the API, test browser-facing
behavior through `TestClient`, including error status codes and SSE events.
For LLM changes, verify all construction still goes through `create_llm()`.
