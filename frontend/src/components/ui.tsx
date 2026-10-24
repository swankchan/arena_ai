import { useEffect, type ReactNode } from "react";
import { AlertCircle, LoaderCircle, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown></div>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <span className="spinner"><LoaderCircle size={17} className="spin" />{label}</span>;
}

export function SystemStatus({ online }: { online: boolean }) {
  const backendLabel = online ? "Backend online" : "Backend offline";
  const apiLabel = online ? "API connected" : "API unavailable";
  const label = `${backendLabel} · ${apiLabel}`;
  const dotClass = `status-dot${online ? " online" : ""}`;
  return (
    <div className="topbar-status" role="status" aria-label={label} title={label}>
      <span className={dotClass} aria-hidden="true" />
      <span>{backendLabel}</span>
      <span aria-hidden="true">{" · "}</span>
      <span className={dotClass} aria-hidden="true" />
      <span>{apiLabel}</span>
    </div>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return <div className="alert error"><AlertCircle size={18} /><span>{children}</span></div>;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? "disabled" : ""}`}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
