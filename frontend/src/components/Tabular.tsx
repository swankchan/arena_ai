import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Download,
  FileSpreadsheet,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "../api";
import type { SQLResult, TabularFile } from "../types";
import { downloadCSV, formatDate } from "../lib/format";
import { EmptyState, ErrorBanner, Spinner } from "./ui";

export function Tabular({
  collection,
  onNotice,
  onSummaryChanged,
}: {
  collection: string;
  onNotice: (message: string) => void;
  onSummaryChanged: () => Promise<void>;
}) {
  const [files, setFiles] = useState<TabularFile[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [sql, setSQL] = useState("");
  const [result, setResult] = useState<SQLResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<"sql" | "natural" | null>(null);
  const [error, setError] = useState("");

  const selected = files.find((file) => file.id === selectedId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.listTabularFiles(collection);
      setFiles(response.files);
      setSelectedId((current) => current && response.files.some((file) => file.id === current)
        ? current
        : response.files[0]?.id || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load tabular files.");
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setResult(null);
    setError("");
    if (selected) {
      const table = selected.table_name.replaceAll('"', '""');
      setSQL(`SELECT * FROM "${table}" LIMIT 1000`);
    } else {
      setSQL("");
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (kind: "sql" | "natural") => {
    if (!selected) return;
    setRunning(kind);
    setError("");
    try {
      const response = kind === "sql"
        ? await api.querySQL(collection, selected.id, sql)
        : await api.queryNatural(collection, selected.id, question);
      if (response.error) setError(response.error);
      setResult(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Query failed.");
      setResult(null);
    } finally {
      setRunning(null);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`Delete ${selected.filename} and its tabular database?`)) return;
    try {
      const response = await api.deleteTabularFile(collection, selected.id);
      setSelectedId(null);
      await Promise.all([load(), onSummaryChanged()]);
      onNotice(
        `${selected.filename} deleted.`
        + (response.summary_error ? " Collection description was not updated." : ""),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delete failed.");
    }
  };

  const columns = result?.columns || (result?.rows.length ? Object.keys(result.rows[0]) : []);
  const count = result?.row_count ?? result?.results_count ?? result?.rows.length ?? 0;

  return (
    <div className="page-stack">
      <header className="page-heading"><div><span className="eyebrow">Structured data</span><h1>Tabular analysis</h1><p>Ask in natural language or run read-only SQLite queries against uploaded CSV and Excel files.</p></div></header>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {loading ? <div className="center-loading"><Spinner label="Loading tables" /></div> : files.length && selected ? (
        <>
          <section className="card table-selector-card">
            <div className="table-selector">
              <div className="document-type"><FileSpreadsheet size={22} /></div>
              <label className="field"><span>Active table</span><select value={selected.id} onChange={(event) => setSelectedId(Number(event.target.value))}>{files.map((file) => <option value={file.id} key={file.id}>{file.filename}</option>)}</select></label>
              <div className="table-facts"><span><strong>{selected.row_count}</strong> rows</span><span><strong>{Object.keys(selected.columns).length}</strong> columns</span><span>Uploaded {formatDate(selected.created_at)}</span></div>
              <button className="icon-button danger-text" onClick={() => void remove()} aria-label="Delete tabular file"><Trash2 size={18} /></button>
            </div>
            <details className="schema-details"><summary>View schema <code>{selected.table_name}</code></summary><div className="schema-grid">{Object.entries(selected.columns).map(([name, info]) => <div key={name}><strong>{name}</strong><span>{info.type || info.category || "unknown"}</span>{info.null_count != null && <small>{info.null_count} nulls</small>}</div>)}</div></details>
          </section>

          <div className="query-grid">
            <section className="card query-card">
              <div className="card-heading"><div><h2><Sparkles size={19} />Natural language</h2><p>Let the backend generate and execute SQL.</p></div></div>
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. What is the total amount by region?" rows={5} />
              <button className="button primary" disabled={!question.trim() || running !== null} onClick={() => void run("natural")}>{running === "natural" ? <Spinner label="Generating SQL" /> : <><Sparkles size={16} />Generate and run</>}</button>
            </section>
            <section className="card query-card">
              <div className="card-heading"><div><h2><Database size={19} />Direct SQL</h2><p>Read-only SELECT and WITH queries.</p></div></div>
              <textarea className="code-input" value={sql} onChange={(event) => setSQL(event.target.value)} rows={5} spellCheck={false} />
              <button className="button secondary" disabled={!sql.trim() || running !== null} onClick={() => void run("sql")}>{running === "sql" ? <Spinner label="Running" /> : <><Play size={16} />Run query</>}</button>
            </section>
          </div>

          {result && !result.error && (
            <section className="card results-card">
              <div className="card-heading"><div><h2>Results <span className="count-badge">{count}</span></h2>{result.sql_query && <code className="generated-sql">{result.sql_query}</code>}{result.sql_generation_log && <p>{result.sql_generation_log}</p>}</div>
                <button className="button secondary" disabled={!result.rows.length} onClick={() => downloadCSV(result.rows)}><Download size={16} />Export CSV</button>
              </div>
              {result.truncated && <div className="alert info">Showing the first {result.rows.length} rows. Export is limited to the displayed result set.</div>}
              {result.rows.length ? <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{row[column] == null ? "—" : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column])}</td>)}</tr>)}</tbody></table></div> : <div className="inline-empty">Query completed with no rows.</div>}
            </section>
          )}
        </>
      ) : (
        <EmptyState icon={<FileSpreadsheet size={30} />} title="No tabular files yet">
          Upload a CSV, XLSX, or XLS file in the Documents workspace. The backend will create a queryable SQLite table instead of vector chunks.
        </EmptyState>
      )}
    </div>
  );
}
