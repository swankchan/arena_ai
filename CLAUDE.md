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

## Architecture

### Core Components

| File | Purpose |
|------|---------|
| `app.py` | Streamlit web UI, session management, chat interface |
| `rag_engine.py` | Core RAG logic: document processing, retrieval, query optimization, RAGAS evaluation |
| `db.py` | SQLite persistence for conversations, Q&A runs, ratings, and training export |
| `export_training_jsonl.py` | CLI tool to export Q&A data for fine-tuning |

### Data Flow

1. **Document Ingestion**: Files (PDF, HTML, CSV, TXT, XLSX, DOCX) are loaded, chunked (recursive or semantic), and stored in ChromaDB with embeddings.
2. **Retrieval**: Hybrid search combines vector similarity (ChromaDB) + BM25 keyword search. Optional FlashRank reranking.
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
- **Hybrid Search Weights**: `VECTOR_WEIGHT` and `BM25_WEIGHT` control ensemble balance (default 0.5/0.5).
- **Memory Limits**: Short-term memory capped by `CHAT_HISTORY_MAX_MESSAGES` (default 12); long-term via `LONG_TERM_MEMORY_TOP_K` (default 3 past Q&A).
- **Collection Management**: Collections are ChromaDB collections; names are auto-lowercased and validated (3-63 chars, alphanumeric + dots/underscores/hyphens).
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
HYBRID_SEARCH=true
RERANKING=true
TOP_K=4

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
