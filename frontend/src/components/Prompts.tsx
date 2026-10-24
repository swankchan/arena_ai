import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LockKeyhole, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../api";
import type { Prompt } from "../types";
import { ErrorBanner, Spinner, Toggle } from "./ui";

export function Prompts({ onNotice }: { onNotice: (message: string) => void }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api.listPrompts();
      setPrompts(response.prompts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load prompts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createPrompt(name, content);
      setName("");
      setContent("");
      onNotice("System prompt created.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create prompt.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (prompt: Prompt, enabled: boolean) => {
    try {
      const updated = await api.setPromptEnabled(prompt.id, enabled);
      setPrompts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update prompt.");
    }
  };

  const remove = async (prompt: Prompt) => {
    if (!window.confirm(`Delete prompt ${prompt.name}?`)) return;
    try {
      await api.deletePrompt(prompt.id);
      setPrompts((current) => current.filter((item) => item.id !== prompt.id));
      onNotice("System prompt deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete prompt.");
    }
  };

  return (
    <div className="page-stack">
      <header className="page-heading"><div><span className="eyebrow">Behavior controls</span><h1>System prompts</h1><p>Collection Guard is always active. Enabled custom prompts are appended in alphabetical order.</p></div></header>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div className="prompt-layout">
        <section className="card">
          <div className="card-heading"><div><h2>Prompt library</h2><p>Shared by all collections in this backend.</p></div><span className="count-badge">{prompts.length}</span></div>
          {loading ? <Spinner label="Loading prompts" /> : <div className="prompt-list">{prompts.map((prompt) => (
            <article className="prompt-item" key={prompt.id}>
              <div className="prompt-item-header">
                <div className="prompt-name">{prompt.name === "collection_guard" ? <LockKeyhole size={17} /> : <ShieldCheck size={17} />}<strong>{prompt.name}</strong>{prompt.name === "collection_guard" && <span className="protected-badge">Protected</span>}</div>
                <div className="prompt-actions">
                  {prompt.name !== "collection_guard" && <button className="icon-button danger-text" onClick={() => void remove(prompt)} aria-label={`Delete ${prompt.name}`}><Trash2 size={16} /></button>}
                </div>
              </div>
              <details><summary>View prompt content</summary><pre>{prompt.content}</pre></details>
              <Toggle label="Enabled" checked={prompt.enabled} disabled={prompt.name === "collection_guard"} onChange={(enabled) => void toggle(prompt, enabled)} />
            </article>
          ))}</div>}
        </section>

        <section className="card prompt-create">
          <div className="card-heading"><div><h2>Add a custom prompt</h2><p>Give the model additional instructions after Collection Guard.</p></div></div>
          <form onSubmit={(event) => void create(event)}>
            <label className="field"><span>Prompt name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. concise_technical" maxLength={100} required /></label>
            <label className="field"><span>Instructions</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Answer with concise bullet points and cite the supplied context…" rows={10} maxLength={50000} required /></label>
            <button className="button primary" disabled={busy || !name.trim() || !content.trim()}>{busy ? <Spinner label="Creating" /> : <><Plus size={17} />Create enabled prompt</>}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
