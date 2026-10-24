import { useCallback, useEffect, useRef, useState } from "react";
import {
  CloudUpload,
  File,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "../api";
import type { DocumentItem, IngestionJob, PublicConfig } from "../types";
import { formatBytes } from "../lib/format";
import { formatIngestionCompletion, formatIngestionCounts } from "../lib/ingestion";
import { ErrorBanner, Spinner } from "./ui";

export function Documents({
  collection,
  config,
  onNotice,
  onSummaryChanged,
}: {
  collection: string;
  config: PublicConfig | null;
  onNotice: (message: string) => void;
  onSummaryChanged: () => Promise<void>;
}) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  const loadDocuments = useCallback(async () => {
    setError("");
    try {
      const result = await api.listDocuments(collection);
      if (mounted.current) setDocuments(result.documents);
    } catch (caught) {
      if (mounted.current) setError(caught instanceof Error ? caught.message : "Could not load documents.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [collection]);

  useEffect(() => {
    mounted.current = true;
    setFiles([]);
    setJob(null);
    void loadDocuments();
    return () => { mounted.current = false; };
  }, [loadDocuments]);

  const chooseFiles = (selected: File[]) => {
    setFiles((current) => [...current, ...selected]);
    setError("");
  };

  const upload = async () => {
    if (!files.length || job?.status === "running" || job?.status === "queued") return;
    setError("");
    try {
      let current = await api.uploadDocuments(collection, files);
      if (!mounted.current) return;
      setJob(current);
      while (current.status === "queued" || current.status === "running") {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        current = await api.job(current.id);
        if (!mounted.current) return;
        setJob(current);
      }
      if (current.status === "succeeded") {
        setFiles([]);
        if (inputRef.current) inputRef.current.value = "";
        await Promise.all([loadDocuments(), onSummaryChanged()]);
        onNotice(
          formatIngestionCompletion(current)
          + (current.summary_error ? " Collection description was not updated." : ""),
        );
      } else {
        setError(current.errors.join(" · ") || "Document processing failed.");
      }
    } catch (caught) {
      if (mounted.current) setError(caught instanceof Error ? caught.message : "Upload failed.");
    }
  };

  const remove = async (document: DocumentItem) => {
    if (!window.confirm(`Delete all chunks from ${document.name}?`)) return;
    try {
      const result = await api.deleteDocument(collection, document.source);
      await Promise.all([loadDocuments(), onSummaryChanged()]);
      onNotice(
        `Deleted ${result.deleted_chunks} chunks from ${document.name}.`
        + (result.summary_error ? " Collection description was not updated." : ""),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delete failed.");
    }
  };

  const busy = job?.status === "queued" || job?.status === "running";
  const accept = config?.supported_extensions.map((extension) => `.${extension}`).join(",");

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><span className="eyebrow">Knowledge ingestion</span><h1>Documents</h1><p>Upload documents for vector search or CSV/Excel files for SQL analysis in {collection}.</p></div>
        <button className="button secondary" onClick={() => void loadDocuments()}><RefreshCw size={16} />Refresh</button>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <section className="card upload-card">
        <div
          className="dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            chooseFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            onChange={(event) => chooseFiles(Array.from(event.target.files || []))}
            id="document-upload"
          />
          <div className="upload-icon"><CloudUpload size={28} /></div>
          <h2>Drop files here, or choose from your computer</h2>
          <p>{config?.supported_extensions.join(", ").toUpperCase()} · Up to {config?.max_upload_size_mb || 50} MB per file</p>
          <label htmlFor="document-upload" className="button secondary"><Upload size={16} />Choose files</label>
        </div>

        {!!files.length && (
          <div className="selected-files">
            <div className="selected-header"><strong>{files.length} file{files.length === 1 ? "" : "s"} selected</strong>
              <button className="button ghost" onClick={() => setFiles([])} disabled={busy}>Clear</button>
            </div>
            {files.map((file, index) => (
              <div className="selected-file" key={`${file.name}-${file.lastModified}-${index}`}>
                <File size={17} /><span>{file.name}</span><small>{formatBytes(file.size)}</small>
                <button
                  className="icon-button"
                  disabled={busy}
                  onClick={() => setFiles((current) => current.filter((_, item) => item !== index))}
                  aria-label={`Remove ${file.name}`}
                ><X size={15} /></button>
              </div>
            ))}
            <button className="button primary upload-submit" onClick={() => void upload()} disabled={busy}>
              {busy ? <Spinner label="Processing" /> : <><CloudUpload size={17} />Upload and process</>}
            </button>
          </div>
        )}

        {job && (
          <div className="job-status">
            <div><strong>{busy ? "Processing uploads" : job.status === "succeeded" ? "Processing complete" : "Processing failed"}</strong><span>{formatIngestionCounts(job)}</span></div>
            <div className="progress-track"><span style={{ width: `${Math.round(job.progress * 100)}%` }} /></div>
            <small>{Math.round(job.progress * 100)}% · {job.status}</small>
            {!!job.errors.length && <div className="job-errors">{job.errors.map((item) => <p key={item}>{item}</p>)}</div>}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-heading"><div><h2>Indexed documents</h2><p>Sources currently stored in this collection.</p></div><span className="count-badge">{documents.length}</span></div>
        {loading ? <Spinner label="Loading documents" /> : documents.length ? (
          <div className="document-list">
            {documents.map((document) => (
              <div className="document-row" key={document.source}>
                <div className="document-type">{/\.(csv|xlsx|xls)$/i.test(document.name) ? <FileSpreadsheet size={20} /> : <FileText size={20} />}</div>
                <div><strong>{document.name}</strong><span title={document.source}>{document.source}</span></div>
                <button className="icon-button danger-text" onClick={() => void remove(document)} aria-label={`Delete ${document.name}`}><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-empty"><FileText size={25} /><strong>No indexed documents yet</strong><span>Upload a PDF, text file, or document above. Tabular files appear in the Tabular workspace.</span></div>
        )}
      </section>
    </div>
  );
}
