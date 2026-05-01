# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Retrieval-Augmented Generation (RAG)** system with a Streamlit web interface, supporting local LLMs via Ollama. It implements hybrid search (vector + BM25), reranking, conversation memory, and SQLite persistence for training data export.

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
| `app.py` | Streamlit web UI, session management, chat interface |
| `rag_engine.py` | Core RAG logic: document processing, retrieval, query optimization, RAGAS evaluation |
| `db.py` | SQLite persistence for conversations, Q&A runs, ratings, and training export |
| `export_training_jsonl.py` | CLI tool to export Q&A data for fine-tuning |

### Data Flow

1. **Document Ingestion**: Files (PDF, HTML, CSV, TXT, XLSX, DOCX) are loaded, chunked (recursive or semantic), and stored in Elasticsearch with embeddings.
2. **Retrieval**: Vector search using dense vectors stored in Elasticsearch. Optional FlashRank reranking.
3. **Query Optimization**: LLM transforms vague queries and expands into multiple query variations when enabled.
4. **Memory Injection**: Short-term (recent chat) and long-term (similar past Q&A from SQLite) context is prepended to retrieved documents.
5. **Generation**: LLM produces step-by-step reasoning followed by final answer, using a structured prompt template.
6. **Persistence**: Q&A runs, metrics, and user ratings (like/dislike) are stored in `rag_app.db`.

### Model Architecture

| Role | Model | Source |
|------|-------|--------|
| Generation | `qwen3.5:9b` | Ollama (local) |
| Embeddings | `bge-large-en-v1.5` (1024-dim) | HuggingFace |
| Reranking | `ms-marco-MiniLM-L-12-v2` | FlashRank |

### Key Technical Details

- **Chunking Strategy**: Configurable via `CHUNKING_STRATEGY` env var: `recursive` (default) or `semantic`.
- **Vector Storage**: Elasticsearch stores dense vectors (1024-dim for `bge-large-en-v1.5`) with cosine similarity search.
- **Memory Limits**: Short-term memory capped by `CHAT_HISTORY_MAX_MESSAGES` (default 12); long-term via `LONG_TERM_MEMORY_TOP_K` (default 3 past Q&A).
- **Collection Management**: Collections are Elasticsearch indices with `rag_` prefix; names are auto-lowercased and validated.
- **RAGAS Evaluation**: Optional evaluation using faithfulness, answer relevancy, and context precision metrics. Falls back to Ollama's OpenAI-compatible endpoint if LangChain wrapper fails.

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

## Exporting Training Data

```bash
# Full records with all metadata
python export_training_jsonl.py -o training.jsonl

# Likes only, chat format for SFT
python export_training_jsonl.py -o likes.jsonl --rating like --format sft_messages

# Alpaca format for specific collection
python export_training_jsonl.py -o alpaca.jsonl --format sft_alpaca --collection my_kb
```

Formats:
- `record`: Full fields including sources, metrics, user_rating
- `sft_messages`: `{"messages": [{"role": "user"}, {"role": "assistant"}], "metadata": {}}`
- `sft_alpaca`: Instruction/input/output style

## Development Notes

- **Environment**: Uses `conda` environment named `rag` (Python 3.11+).
- **Dependencies**: Standard ML/NLP stack including LangChain, ChromaDB, sentence-transformers, FlashRank, RAGAS.
- **No test suite**: There are no automated tests in this codebase.
- **No linting/formatting config**: No pre-configured ruff, black, or mypy settings.
- **SQLite threading**: Database connections use `check_same_thread=False` for Streamlit compatibility.
- **Document deletion**: Uses `source` metadata field to identify and delete all chunks for a given document.

## Common Commands

```bash
# Start the Streamlit web interface
streamlit run app.py

# Export training data (all records)
python export_training_jsonl.py -o training.jsonl

# Export likes-only for SFT (chat format)
python export_training_jsonl.py -o likes.jsonl --rating like --format sft_messages

# Export in Alpaca format for a specific collection
python export_training_jsonl.py -o alpaca.jsonl --format sft_alpaca --collection my_kb
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
| `ENABLE_RAGAS` | Enable evaluation metrics | `false` |
| `LONG_TERM_MEMORY_TOP_K` | Past Q&A snippets to inject | `3` |
| `CHAT_HISTORY_MAX_MESSAGES` | Short-term memory turns | `12` |
| `CHAT_HISTORY_MAX_CHARS_PER_MESSAGE` | Max chars per chat message | `2000` |
| `PERSIST_DIRECTORY` | ChromaDB storage path (legacy) | `./chroma_db` |
| `APP_DB_PATH` | SQLite database path | `./rag_app.db` |
| `ES_URL` | Elasticsearch URL | `http://localhost:9200` |
| `ES_USER` | Elasticsearch username | `elastic` |
| `ES_PASS` | Elasticsearch password | `openrag` |
