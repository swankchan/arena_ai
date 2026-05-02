# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Retrieval-Augmented Generation (RAG)** system with a Streamlit web interface, supporting local LLMs via Ollama.

It implements vector search with Elasticsearch, reranking, conversation memory, and SQLite persistence.

**Data Flow:**
1. **Chunking**: Documents split using `RecursiveCharacterTextSplitter` or `SemanticChunker`
2. **Embedding**: `ElasticStore` converts chunks to vectors using the embedding model
3. **Searching**: Vector search against Elasticsearch via `vectorstore.get_retriever()`
4. **Reranking**: Optional, using FlashRank when `RERANKING=true`
5. **LLMing**: Query optimization (transformation + expansion) → Retrieval → Context assembly → Final answer generation

## Running the Application

```bash
# Start the Streamlit app
streamlit run app.py

# Requires Ollama running locally with the configured model
ollama pull qwen3.5:9b
```

## Start Elasticsearch

```bash
docker compose -f docker-compose.elasticsearch.yml up -d
```

Verify it's running:
```bash
curl http://localhost:9200
```

**Default credentials:**
- URL: `http://localhost:9200`
- User: `elastic`
- Password: `openrag`

## Architecture

### Core Components

| File | Purpose |
|------|---------|
| `app.py` | Streamlit web UI, session management, chat interface, collection/QA management, system prompt management |
| `rag_engine.py` | Core RAG logic: document processing, retrieval, query optimization, tabular SQL generation |
| `db.py` | SQLite persistence for conversations, Q&A runs, messages, ratings, system prompts |
| `tabular_engine.py` | Tabular data handler with Text-to-SQL and Pandas analysis |
| `elastic_store.py` | Elasticsearch vector store integration |

### Model Architecture

| Role | Model | Source |
|------|-------|--------|
| Generation | `qwen3.5:9b` | Ollama (local) |
| Embeddings | `bge-large-en-v1.5` (1024-dim) | HuggingFace |
| Reranking | `ms-marco-MiniLM-L-12-v2` | FlashRank |

### Key Technical Details

- **System Prompts**: Two-tier system: `collection_guard` (always active, cannot be deleted) and user-defined prompts (enabled/disabled via UI, appended to guard). Stored in SQLite `system_prompts` table.
- **Chunking Strategy**: Configurable via `CHUNKING_STRATEGY` env var: `recursive` (default) or `semantic`.
- **Vector Storage**: Elasticsearch stores dense vectors (1024-dim for `bge-large-en-v1.5`) with cosine similarity search.
- **Memory Limits**: Short-term memory capped by `CHAT_HISTORY_MAX_MESSAGES` (default 12); long-term via `LONG_TERM_MEMORY_TOP_K` (default 3 past Q&A).
- **Collection Management**: Collections are Elasticsearch indices with `rag_` prefix; names are auto-lowercased and validated.
- **Tabular Data**: CSV/XLSX/XLS files are loaded into pandas DataFrames and SQLite for SQL queries. Natural language to SQL conversion is supported via LLM.
- **RAGAS Evaluation**: Removed. Response evaluation no longer includes RAGAS metrics.
- **QA Management**: Users can browse and delete past Q&A runs from the database via the UI.

## Configuration

All configuration is via `.env` (see `.env.example`):

```bash
# Core
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen3.5:9b
OLLAMA_BASE_URL=http://localhost:11434

# RAG
CHUNK_SIZE=1000
CHUNK_OVERLAP=100
CHUNKING_STRATEGY=recursive  # or semantic
RERANKING=true
TOP_K=4

# Elasticsearch
ES_URL=http://localhost:9200
ES_USER=elastic
ES_PASS=openrag

# Query optimization
QUERY_TRANSFORMATION=true
QUERY_EXPANSION=true

# Memory
LONG_TERM_MEMORY_TOP_K=3
CHAT_HISTORY_MAX_MESSAGES=12

# Paths
PERSIST_DIRECTORY=./chroma_db
APP_DB_PATH=./rag_app.db
```

## Development Notes

- **Environment**: Uses `conda` environment named `rag` (Python 3.11+).
- **Dependencies**: Standard ML/NLP stack including LangChain, ChromaDB, sentence-transformers, FlashRank, pandas, openpyxl.
- **No test suite**: There are no automated tests in this codebase.
- **No linting/formatting config**: No pre-configured ruff, black, or mypy settings.
- **SQLite threading**: Database connections use `check_same_thread=False` for Streamlit compatibility.
- **Document deletion**: Uses `source` metadata field to identify and delete all chunks for a given document.
- **Conversation persistence**: Chat messages are stored in SQLite and loaded when switching between collections.
- **Tabular SQL Generation**: `_query_tabular_sql()` in `rag_engine.py` handles natural language to SQL conversion using pattern matching and LLM fallback.

## Common Commands

```bash
# Start the Streamlit web interface
streamlit run app.py
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | LLM provider (`ollama` or `openai`) | `ollama` |
| `OLLAMA_MODEL` | Ollama model name | `qwen3.5:9b` |
| `OLLAMA_BASE_URL` | Ollama base URL | `http://localhost:11434` |
| `OPENAI_API_KEY` | OpenAI API key (for OpenAI provider) | - |
| `CHUNK_SIZE` | Document chunk size | `1000` |
| `CHUNK_OVERLAP` | Chunk overlap tokens | `100` |
| `CHUNKING_STRATEGY` | Chunking method (`recursive` or `semantic`) | `recursive` |
| `EMBEDDING_MODEL` | HuggingFace embedding model | `BAAI/bge-large-en-v1.5` |
| `RERANKING` | Enable FlashRank reranking | `true` |
| `RERANK_MODEL` | FlashRank reranker model | `ms-marco-MiniLM-L-12-v2` |
| `TOP_K` | Number of documents to retrieve | `4` |
| `QUERY_TRANSFORMATION` | Use LLM to clarify queries | `true` |
| `QUERY_EXPANSION` | Generate query variations | `true` |
| `LONG_TERM_MEMORY_TOP_K` | Past Q&A snippets to inject | `3` |
| `CHAT_HISTORY_MAX_MESSAGES` | Short-term memory turns | `12` |
| `CHAT_HISTORY_MAX_CHARS_PER_MESSAGE` | Max chars per chat message | `2000` |
| `PERSIST_DIRECTORY` | ChromaDB storage path (legacy) | `./chroma_db` |
| `APP_DB_PATH` | SQLite database path | `./rag_app.db` |
| `ES_URL` | Elasticsearch URL | `http://localhost:9200` |
| `ES_USER` | Elasticsearch username | `elastic` |
| `ES_PASS` | Elasticsearch password | `openrag` |

## UI Features

### Collection Management (Sidebar)
- **Create New**: Expandable section to create new collections
- **Open**: Select from existing collections
- **Rename**: Inline rename with validation
- **Delete**: Primary button to delete a collection (removes Elasticsearch index)

### Conversation Management
- New conversation thread automatically created when switching collections
- Chat messages persisted to SQLite and restored on collection change

### Q&A History (Sidebar)
- Browse past 25 Q&A runs per collection
- View full stored answer in expander
- Delete individual Q&A runs (cascades to delete associated messages)

### Tabular Analysis Tab
- Upload CSV/XLSX/XLS files in the "Manage Documents" tab
- **Natural Language Query**: Ask questions in plain English (e.g., "What is the total sales?", "Show me the top 10 records")
- **SQL Query**: Write and execute SQL queries directly on uploaded data
- Results display with dataframe and CSV download

### System Prompt Manager (System Prompt Tab)
- **collection_guard**: Always active, cannot be deleted or disabled
- **User prompts**: Each has an "Enabled" checkbox to toggle; all enabled prompts are appended to `collection_guard`
- **Delete**: Available for user prompts (not `collection_guard`)
