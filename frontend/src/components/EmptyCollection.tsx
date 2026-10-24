import { useState, type FormEvent } from "react";
import { ArrowRight, DatabaseZap } from "lucide-react";
import { EmptyState, ErrorBanner } from "./ui";

export function EmptyCollection({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate(name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create collection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EmptyState
      icon={<DatabaseZap size={32} />}
      title="Build your first knowledge base"
      action={(
        <form className="empty-create" onSubmit={(event) => void submit(event)}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Collection name"
            minLength={3}
            maxLength={63}
            required
            aria-label="Collection name"
          />
          <button className="button primary" disabled={busy}>Create collection<ArrowRight size={17} /></button>
          {error && <ErrorBanner>{error}</ErrorBanner>}
        </form>
      )}
    >
      Create a collection, add your documents, and ask questions grounded in your own content. Everything stays on your local backend.
    </EmptyState>
  );
}
