# Advanced RAG Project with Ollama

This project implements a Retrieval-Augmented Generation (RAG) system with a Streamlit web interface, supporting local LLMs via Ollama, multiple collections, hybrid search, reranking, conversation memory, and SQLite persistence.

## Key ideas

- **Embedding dimensions**: Higher dimensional embeddings can capture more nuance, at the cost of compute and storage.
- **Ways to improve retrieval quality**:
  - **Hybrid search**: Combine semantic (vector) + keyword (BM25) retrieval, with weights (e.g. 0.5 / 0.5).
  - **Reranking**: Use FlashRank to rerank retrieved chunks by query relevance.
  - **Chunking**: Smaller chunks can be more precise; overlap can help. Semantic chunking can improve coherence vs fixed-size splits.
  - **Top-k**: Returning more candidates can help recall; reranking helps keep the best ones.
  - **HyDE** (optional): Generate a hypothetical answer/document to improve retrieval recall.
- **Sampling parameters**:
  - **top_k**: Limits the next-token candidates to the top K most likely tokens.
  - **top_p**: Nucleus sampling; chooses from the smallest set of tokens whose cumulative probability exceeds P.
- **Evaluation**:
  - **RAGAS** can evaluate RAG responses with metrics like faithfulness Aand relevancy (when supported by your LLM wrapper).

## AI Models Architecture

The system utilizes three specialized local models to ensure high-precision and private retrieval:


| Role                       | Model Name                | Size/Dimension     | Deployment          |
| -------------------------- | ------------------------- | ------------------ | ------------------- |
| **Generation & Reasoning** | `qwen3.5:9b`              | 9 Billion Params   | Local (Ollama)      |
| **Search & Embeddings**    | `bge-large-en-v1.5`       | 1024 Dim           | Local (HuggingFace) |
| **Refinement & Reranking** | `ms-marco-MiniLM-L-12-v2` | ~33 Million Params | Local (FlashRank)   |


---

## Features

- **Multi-Format Support**: Upload PDF, HTML, CSV, TXT, XLSX, and DOCX.
- **Web Interface**: Manage multiple collections, upload/delete documents with progress tracking.
- **Performance Metrics**: Shows total tokens, tokens per second (TPS), and total generation time.
- **LLM Reasoning**: Step-by-step "Chain-of-Thought" reasoning for every answer.
- **Conversation memory**: Short-term (recent turns in the UI thread) and long-term (similar past Q&A from SQLite, same collection) are injected into the generation prompt.
- **SQLite persistence**: All Q&A runs, sources, metrics, and optional RAGAS results are stored in `rag_app.db` (override with `APP_DB_PATH`). Users can rate answers with Like/Dislike.

---

## Setup & Usage

### Prerequisites

- Conda environment `rag`.
- [Ollama](https://ollama.com/) installed and running locally.
- Python 3.11+.

### Installation

1. **Configure Environment**:
  ```bash
   cp .env.example .env
  ```
   Edit `.env` and set your preferred model and parameters.
2. **Install Dependencies**:
  ```bash
   conda activate rag
   pip install -r requirements.txt
  ```
3. **Pull the Model**:
  ```bash
   ollama pull qwen3.5:9b
  ```

### Running the App

```bash
streamlit run app.py
```

### Export training data (JSONL)

Use the sidebar **Export for training (JSONL)** to download Q&A plus optional Like/Dislike labels, or run:

```bash
python export_training_jsonl.py -o training.jsonl
python export_training_jsonl.py -o likes.jsonl --rating like --format sft_messages
```

- `**record**`: full fields (question, answer, sources, metrics, `user_rating`, etc.) — best for analysis and custom pipelines.
- `**sft_messages**`: `{"messages":[{user},{assistant}], "metadata":{...}}` — common for supervised fine-tuning.
- `**sft_alpaca**`: instruction/input/output style.

DPO-style training needs a **chosen** and **rejected** completion for the same prompt; this export gives you labels and text so you can build pairs offline (e.g. treat likes as chosen and a second model pass as rejected).

---

## Configuration (.env)


| Variable                             | Description                                   | Default                  |
| ------------------------------------ | --------------------------------------------- | ------------------------ |
| `LLM_PROVIDER`                       | LLM service (`ollama` or `openai`)            | `ollama`                 |
| `OLLAMA_MODEL`                       | Ollama model name                             | `qwen3.5:9b`             |
| `EMBEDDING_MODEL`                    | Embedding model for search                    | `BAAI/bge-large-en-v1.5` |
| `CHUNKING_STRATEGY`                  | `semantic` or `recursive`                     | `semantic`               |
| `HYBRID_SEARCH`                      | Enable keyword + vector search                | `true`                   |
| `RERANKING`                          | Enable FlashRank reranking                    | `true`                   |
| `TOP_K`                              | Number of documents to retrieve               | `5`                      |
| `QUERY_TRANSFORMATION`               | Clarify vague queries                         | `true`                   |
| `QUERY_EXPANSION`                    | Search for query variations                   | `true`                   |
| `ENABLE_RAGAS`                       | Enable accuracy evaluation                    | `false`                  |
| `LLM_TEMPERATURE`                    | Factuality (0.0) vs Creativity (1.0)          | `0.1`                    |
| `APP_DB_PATH`                        | SQLite file for Q&A + ratings                 | `./rag_app.db`           |
| `LONG_TERM_MEMORY_TOP_K`             | Past similar Q&A snippets to inject           | `3`                      |
| `CHAT_HISTORY_MAX_MESSAGES`          | Max prior chat messages for short-term memory | `12`                     |
| `CHAT_HISTORY_MAX_CHARS_PER_MESSAGE` | Max chars stored per chat message in memory   | `2000`                   |


## Improvement considerations

- **Agentic routing**: Decide when to retrieve from the KB vs answer from memory alone to reduce latency and cost.

