import { Braces, Cpu, Database, FileSearch, Layers3, Server, ShieldCheck, Workflow } from "lucide-react";
import type { PublicConfig } from "../types";

export function About({ config }: { config: PublicConfig | null }) {
  return (
    <div className="page-stack about-page">
      <header className="page-heading"><div><span className="eyebrow">Help & architecture</span><h1>Local-first retrieval, decoupled by design</h1><p>A React client and FastAPI service working together without a hosted LLM or an external vector database.</p></div></header>

      <section className="architecture-card">
        <div className="architecture-node"><Braces size={24} /><strong>React SPA</strong><span>REST + SSE</span></div>
        <div className="architecture-arrow">→</div>
        <div className="architecture-node emphasized"><Server size={24} /><strong>FastAPI</strong><span>RAG orchestration</span></div>
        <div className="architecture-arrow">→</div>
        <div className="architecture-services"><div><Database size={18} />LanceDB</div><div><Layers3 size={18} />SQLite</div><div><Cpu size={18} />llama.cpp</div></div>
      </section>

      <div className="about-grid">
        <section className="card"><FileSearch size={23} /><h2>Grounded retrieval</h2><p>Documents are chunked and embedded into collection-scoped LanceDB tables. Search explicitly bypasses vector indexes for exact cosine kNN, with optional FlashRank reranking.</p></section>
        <section className="card"><Workflow size={23} /><h2>Streaming pipeline</h2><p>The backend optimizes the query, retrieves context, assembles memory and prompts, then streams reasoning and answer events over Server-Sent Events.</p></section>
        <section className="card"><ShieldCheck size={23} /><h2>Clear trust boundary</h2><p>The browser never connects directly to LanceDB, SQLite, or llama.cpp. Upload validation and read-only SQL stay on the server.</p></section>
      </div>

      <section className="card">
        <div className="card-heading"><div><h2>Current runtime</h2><p>Configuration comes from the backend environment; no provider secrets are sent to the browser.</p></div></div>
        {config && <dl className="config-grid">
          <div><dt>LLM provider</dt><dd>{config.llm.provider}</dd></div>
          <div><dt>Model alias</dt><dd><code>{config.llm.model}</code></dd></div>
          <div><dt>API endpoint</dt><dd><code>{config.llm.base_url}</code></dd></div>
          <div><dt>Embedding model</dt><dd><code>{config.embedding_model}</code> · {config.embedding_dimensions} dimensions</dd></div>
          <div><dt>Chunking</dt><dd>{config.chunking_strategy} · {config.chunk_size} / {config.chunk_overlap}</dd></div>
          <div><dt>Reranking</dt><dd>{config.reranking ? config.rerank_model : "Disabled"}</dd></div>
        </dl>}
      </section>

      <section className="card quick-guide">
        <div><span className="eyebrow">Quick guide</span><h2>From documents to answers</h2></div>
        <ol><li><strong>Create a collection</strong><span>Use the sidebar to make an isolated knowledge workspace.</span></li><li><strong>Process documents</strong><span>Upload files and watch the background ingestion job.</span></li><li><strong>Ask and verify</strong><span>Use Chat for grounded answers, then inspect sources and rate the result.</span></li><li><strong>Explore structured data</strong><span>CSV and Excel uploads are also available through natural-language and direct SQL.</span></li></ol>
      </section>
      <footer className="about-footer">Apache 2.0 · React + FastAPI + LanceDB + llama.cpp</footer>
    </div>
  );
}
