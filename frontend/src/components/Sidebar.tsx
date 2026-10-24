import { useState, type FormEvent } from "react";
import {
  BookOpen,
  Check,
  Database,
  MessageSquarePlus,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import type { Conversation, PublicConfig, QueryOptions } from "../types";
import { formatDate } from "../lib/format";
import { ErrorBanner, Modal, Spinner, Toggle } from "./ui";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collections: string[];
  collection: string;
  onSelectCollection: (name: string) => void;
  onCreateCollection: (name: string) => Promise<void>;
  onRenameCollection: (name: string) => Promise<void>;
  onDeleteCollection: () => Promise<void>;
  conversations: Conversation[];
  conversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  queryOptions: QueryOptions;
  onQueryOptions: (options: QueryOptions) => void;
  config: PublicConfig | null;
}

type Dialog = "create" | "rename" | "delete" | null;

export function Sidebar(props: SidebarProps) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [name, setName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setDialog(null);
    setError("");
    setName("");
    setConfirmation("");
  };

  const openDialog = (next: Dialog) => {
    setName(next === "rename" ? props.collection : "");
    setConfirmation("");
    setError("");
    setDialog(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (dialog === "create") await props.onCreateCollection(name);
      if (dialog === "rename") await props.onRenameCollection(name);
      if (dialog === "delete") await props.onDeleteCollection();
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {props.open && <button className="sidebar-scrim" onClick={props.onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${props.open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><BookOpen size={23} /></div>
          <div><strong>RAG KB</strong><span>Local knowledge, grounded answers</span></div>
          <button className="icon-button mobile-close" onClick={props.onClose} aria-label="Close sidebar"><X size={19} /></button>
        </div>

        <div className="sidebar-scroll">
          <section className="sidebar-section">
            <div className="section-label"><span>Collection</span><Database size={14} /></div>
            <select
              value={props.collection}
              onChange={(event) => props.onSelectCollection(event.target.value)}
              disabled={!props.collections.length}
              aria-label="Active collection"
            >
              {!props.collections.length && <option value="">No collections</option>}
              {props.collections.map((name) => <option key={name}>{name}</option>)}
            </select>
            <div className="collection-actions">
              <button className="button subtle" onClick={() => openDialog("create")}><Plus size={15} />New</button>
              <button className="button subtle" disabled={!props.collection} onClick={() => openDialog("rename")}><Pencil size={14} />Rename</button>
              <button className="icon-button danger-text" disabled={!props.collection} onClick={() => openDialog("delete")} aria-label="Delete collection"><Trash2 size={16} /></button>
            </div>
          </section>

          {props.collection && (
            <section className="sidebar-section threads-section">
              <div className="section-label">
                <span>Threads</span>
                <button className="icon-button" onClick={() => void props.onNewConversation()} aria-label="New thread"><MessageSquarePlus size={17} /></button>
              </div>
              <div className="thread-list">
                {props.conversations.map((conversation) => (
                  <div className={`thread ${conversation.id === props.conversationId ? "active" : ""}`} key={conversation.id}>
                    <button className="thread-main" onClick={() => props.onSelectConversation(conversation.id)}>
                      <span>{conversation.name || "New conversation"}</span>
                      <small>{conversation.message_count || 0} messages · {formatDate(conversation.last_active || conversation.created_at)}</small>
                    </button>
                    <button
                      className="thread-delete"
                      aria-label={`Delete ${conversation.name || "conversation"}`}
                      onClick={() => {
                        if (window.confirm("Delete this thread and its saved Q&A?")) {
                          void props.onDeleteConversation(conversation.id);
                        }
                      }}
                    ><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="sidebar-section">
            <div className="section-label"><span>Query optimization</span><Settings2 size={15} /></div>
            <Toggle
              label="Transformation"
              description="Clarify vague questions"
              checked={props.queryOptions.query_transformation}
              onChange={(checked) => props.onQueryOptions({ ...props.queryOptions, query_transformation: checked })}
            />
            <Toggle
              label="Expansion"
              description="Search three query variations"
              checked={props.queryOptions.query_expansion}
              onChange={(checked) => props.onQueryOptions({ ...props.queryOptions, query_expansion: checked })}
            />
          </section>

          {props.config && (
            <section className="sidebar-section technical">
              <div className="section-label"><span>Runtime</span></div>
              <dl>
                <div><dt>LLM</dt><dd>{props.config.llm.model}</dd></div>
                <div><dt>Vectors</dt><dd>LanceDB · exact cosine</dd></div>
                <div><dt>Embeddings</dt><dd title={props.config.embedding_model}>{props.config.embedding_model.split("/").pop()} · {props.config.embedding_dimensions}d</dd></div>
                <div><dt>Chunking</dt><dd>{props.config.chunking_strategy} · {props.config.chunk_size}</dd></div>
                <div><dt>Reranking</dt><dd>{props.config.reranking ? props.config.rerank_model : "Off"}</dd></div>
              </dl>
            </section>
          )}
        </div>
      </aside>

      {dialog && (
        <Modal
          title={dialog === "create" ? "Create a collection" : dialog === "rename" ? "Rename collection" : "Delete collection"}
          onClose={close}
        >
          <form onSubmit={(event) => void submit(event)}>
            <div className="modal-body">
              {dialog === "delete" ? (
                <>
                  <p>This permanently removes <strong>{props.collection}</strong>, including vectors, uploads, conversations, and ratings.</p>
                  <label className="field"><span>Type <strong>{props.collection}</strong> to confirm</span>
                    <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoFocus required />
                  </label>
                </>
              ) : (
                <label className="field"><span>{dialog === "create" ? "Collection name" : "New name"}</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. product-docs"
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]"
                    minLength={3}
                    maxLength={63}
                    autoFocus
                    required
                  />
                  <small>3–63 characters. Letters, numbers, dots, underscores, and hyphens.</small>
                </label>
              )}
              {error && <ErrorBanner>{error}</ErrorBanner>}
            </div>
            <footer className="modal-footer">
              <button type="button" className="button secondary" onClick={close} disabled={busy}>Cancel</button>
              <button
                className={`button ${dialog === "delete" ? "danger" : "primary"}`}
                disabled={busy || (dialog === "delete" && confirmation !== props.collection)}
              >
                {busy ? <Spinner label="Working" /> : dialog === "delete" ? "Delete permanently" : <><Check size={16} />Confirm</>}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
