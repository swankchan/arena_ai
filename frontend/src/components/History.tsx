import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  FileText,
  History as HistoryIcon,
  MessageSquareText,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Zap,
} from "lucide-react";
import { api } from "../api";
import type { QARun, QARunSummary } from "../types";
import { formatDate } from "../lib/format";
import { EmptyState, ErrorBanner, Markdown, Spinner } from "./ui";

export function History({ collection, onNotice }: { collection: string; onNotice: (message: string) => void }) {
  const [runs, setRuns] = useState<QARunSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<QARun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listQARuns(collection);
      setRuns(result.qa_runs);
      setSelectedId((current) => current && result.qa_runs.some((run) => run.id === current)
        ? current
        : result.qa_runs.at(-1)?.id || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let active = true;
    setSelected(null);
    void api.qaRun(selectedId).then((result) => {
      if (active) setSelected(result);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Could not load answer.");
    });
    return () => { active = false; };
  }, [selectedId]);

  const remove = async () => {
    if (!selected || !window.confirm("Delete this Q&A run and its assistant message?")) return;
    try {
      await api.deleteQARun(selected.id);
      setSelected(null);
      setSelectedId(null);
      onNotice("Q&A run deleted.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delete failed.");
    }
  };

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><span className="eyebrow">Persisted in SQLite</span><h1>Q&A history</h1><p>Review grounded answers, source citations, metrics, and feedback.</p></div>
        <button className="button secondary" onClick={() => void load()}><RefreshCw size={16} />Refresh</button>
      </header>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {loading ? <div className="center-loading"><Spinner label="Loading Q&A history" /></div> : runs.length ? (
        <div className="history-layout">
          <aside className="card history-list">
            <div className="card-heading"><h2>Saved questions</h2><span className="count-badge">{runs.length}</span></div>
            {runs.map((run, index) => (
              <button className={`history-item ${run.id === selectedId ? "active" : ""}`} key={run.id} onClick={() => setSelectedId(run.id)}>
                <span>#{index + 1}</span>
                <div><strong>{run.question}</strong><small>{formatDate(run.created_at)}</small></div>
              </button>
            ))}
          </aside>
          <section className="card history-detail">
            {selected ? (
              <>
                <div className="history-detail-header">
                  <div><span className="eyebrow">Question</span><h2>{selected.question}</h2><small>{formatDate(selected.created_at)}</small></div>
                  <button className="icon-button danger-text" onClick={() => void remove()} aria-label="Delete Q&A run"><Trash2 size={18} /></button>
                </div>
                <div className="answer-block"><span className="eyebrow">Answer</span><Markdown>{selected.answer}</Markdown></div>
                {!!selected.sources?.length && <div className="source-row"><span>Sources</span>{selected.sources.map((source) => <span className="source-chip" key={source}><FileText size={13} />{source}</span>)}</div>}
                <div className="metrics-row"><span><Zap size={13} />{selected.metrics?.total_tokens || 0} tokens</span><span><Clock3 size={13} />{selected.metrics?.duration || 0}s</span><span>{selected.metrics?.tokens_per_second || 0} tokens/s</span></div>
                {selected.optimization_log && <details className="optimization"><summary>Query optimization</summary><Markdown>{selected.optimization_log}</Markdown></details>}
                {selected.rating && <div className="saved-rating">{selected.rating.rating === "like" ? <ThumbsUp size={15} /> : <ThumbsDown size={15} />}Rated {selected.rating.rating}</div>}
              </>
            ) : <Spinner label="Loading answer" />}
          </section>
        </div>
      ) : (
        <EmptyState icon={<HistoryIcon size={30} />} title="No saved Q&A yet">
          Ask your first question in the Chat workspace. Completed answers will appear here with their sources and metrics.
          <MessageSquareText size={20} />
        </EmptyState>
      )}
    </div>
  );
}
