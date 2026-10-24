import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  History,
  Info,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { api } from "./api";
import type {
  Conversation,
  PublicConfig,
  QueryOptions,
  WorkspaceTab,
} from "./types";
import { About } from "./components/About";
import { Chat } from "./components/Chat";
import { Documents } from "./components/Documents";
import { EmptyCollection } from "./components/EmptyCollection";
import { History as HistoryWorkspace } from "./components/History";
import { Prompts } from "./components/Prompts";
import { Sidebar } from "./components/Sidebar";
import { Tabular } from "./components/Tabular";
import { ErrorBanner, Spinner, SystemStatus } from "./components/ui";
import "./styles.css";

const tabs = [
  { id: "ask" as const, label: "Chat", icon: MessageSquareText },
  { id: "history" as const, label: "Q&A history", icon: History },
  { id: "documents" as const, label: "Documents", icon: FileText },
  { id: "tabular" as const, label: "Tabular", icon: Table2 },
  { id: "prompts" as const, label: "Prompts", icon: ShieldCheck },
  { id: "about" as const, label: "About", icon: Info },
];

export default function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [llmConnected, setLlmConnected] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);
  const [collection, setCollection] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("ask");
  const [queryOptions, setQueryOptions] = useState<QueryOptions>({
    query_transformation: false,
    query_expansion: false,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const optionsInitialized = useRef(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 4500);
  }, []);

  useEffect(() => {
    void api.config().then(setConfig).catch(() => setConfig(null));
    void api.health().then(() => setBackendOnline(true)).catch(() => setBackendOnline(false));
    void api.llmHealth().then((result) => setLlmConnected(result.connected))
      .catch(() => setLlmConnected(false));
    void api.listCollections().then((result) => {
      setCollections(result.collections);
      const saved = window.localStorage.getItem("rag-collection");
      setCollection(saved && result.collections.includes(saved) ? saved : result.collections[0] || "");
    }).catch((caught) => {
      setPageError(caught instanceof Error ? caught.message : "Could not load collections.");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (config && !optionsInitialized.current) {
      optionsInitialized.current = true;
      setQueryOptions({
        query_transformation: config.query_transformation,
        query_expansion: config.query_expansion,
      });
    }
  }, [config]);

  useEffect(() => {
    if (!collection) {
      setConversations([]);
      setConversationId(null);
      window.localStorage.removeItem("rag-collection");
      return;
    }
    window.localStorage.setItem("rag-collection", collection);
    let active = true;
    setPageError("");
    void api.listConversations(collection).then(async (result) => {
      if (!active) return;
      if (result.conversations.length) {
        setConversations(result.conversations);
        setConversationId((current) => result.conversations.some((item) => item.id === current)
          ? current
          : result.conversations[0].id);
      } else {
        const created = await api.createConversation(collection);
        if (!active) return;
        setConversations([{ ...created, message_count: 0, last_active: null }]);
        setConversationId(created.id);
      }
    }).catch((caught) => {
      if (active) setPageError(caught instanceof Error ? caught.message : "Could not load threads.");
    });
    return () => { active = false; };
  }, [collection]);

  const reloadConversations = useCallback(async (preferred?: string) => {
    if (!collection) return;
    const result = await api.listConversations(collection);
    setConversations(result.conversations);
    if (preferred) setConversationId(preferred);
  }, [collection]);

  const createCollection = async (name: string) => {
    const result = await api.createCollection(name);
    setCollections((current) => [...new Set([...current, result.name])].sort());
    setCollection(result.name);
    setActiveTab("ask");
    setSidebarOpen(false);
    notify(`${result.name} is ready for documents.`);
  };

  const renameCollection = async (name: string) => {
    const result = await api.renameCollection(collection, name);
    setCollections((current) => current.map((item) => item === collection ? result.name : item).sort());
    setCollection(result.name);
    setConversationId(null);
    notify(`Collection renamed to ${result.name}.`);
  };

  const deleteCollection = async () => {
    const deleted = collection;
    await api.deleteCollection(deleted);
    const remaining = collections.filter((item) => item !== deleted);
    setCollections(remaining);
    setCollection(remaining[0] || "");
    setConversationId(null);
    notify(`${deleted} deleted.`);
  };

  const newConversation = async () => {
    if (!collection) return;
    try {
      const created = await api.createConversation(collection);
      await reloadConversations(created.id);
      setActiveTab("ask");
      setSidebarOpen(false);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not create thread.");
    }
  };

  const deleteConversation = async (id: string) => {
    if (!collection) return;
    try {
      await api.deleteConversation(id);
      const result = await api.listConversations(collection);
      if (result.conversations.length) {
        setConversations(result.conversations);
        if (conversationId === id) setConversationId(result.conversations[0].id);
      } else {
        const created = await api.createConversation(collection);
        setConversations([{ ...created, message_count: 0 }]);
        setConversationId(created.id);
      }
      notify("Thread deleted.");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not delete thread.");
    }
  };

  const selectConversation = (id: string) => {
    setConversationId(id);
    setActiveTab("ask");
    setSidebarOpen(false);
  };

  if (loading) {
    return <div className="app-loading"><div className="brand-mark"><BookOpen size={28} /></div><Spinner label="Opening RAG Knowledge Base" /></div>;
  }

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collections={collections}
        collection={collection}
        onSelectCollection={(name) => { setCollection(name); setConversationId(null); setSidebarOpen(false); }}
        onCreateCollection={createCollection}
        onRenameCollection={renameCollection}
        onDeleteCollection={deleteCollection}
        conversations={conversations}
        conversationId={conversationId}
        onSelectConversation={selectConversation}
        onNewConversation={newConversation}
        onDeleteConversation={deleteConversation}
        queryOptions={queryOptions}
        onQueryOptions={setQueryOptions}
        config={config}
      />

      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="topbar-title"><span className="collection-icon"><Database size={17} /></span><div><strong>{collection || "RAG Knowledge Base"}</strong><span>{collection ? "Active collection" : "Local-first RAG workspace"}</span></div></div>
          <SystemStatus backendOnline={backendOnline} llmConnected={llmConnected} />
        </header>

        {pageError && <div className="global-error"><ErrorBanner>{pageError}</ErrorBanner></div>}

        {collection ? (
          <>
            <nav className="workspace-tabs" aria-label="Workspace">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}><Icon size={17} />{tab.label}</button>;
              })}
            </nav>
            <div className="workspace-content">
              <div className="chat-tab" hidden={activeTab !== "ask"}>
                <Chat
                  key={`${collection}:${conversationId || "none"}`}
                  collection={collection}
                  conversationId={conversationId}
                  queryOptions={queryOptions}
                  onConversation={setConversationId}
                  onThreadsChanged={() => void reloadConversations()}
                  onNotice={notify}
                />
              </div>
              {activeTab === "history" && <HistoryWorkspace key={collection} collection={collection} onNotice={notify} />}
              {activeTab === "documents" && <Documents key={collection} collection={collection} config={config} onNotice={notify} />}
              {activeTab === "tabular" && <Tabular key={collection} collection={collection} onNotice={notify} />}
              {activeTab === "prompts" && <Prompts onNotice={notify} />}
              {activeTab === "about" && <About config={config} />}
            </div>
          </>
        ) : (
          <div className="workspace-content empty-app"><EmptyCollection onCreate={createCollection} /></div>
        )}
      </main>

      {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}<button onClick={() => setToast("")} aria-label="Dismiss notification">×</button></div>}
    </div>
  );
}
