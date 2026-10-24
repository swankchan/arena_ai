import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  Bot,
  ChevronDown,
  Clock3,
  FileText,
  Lightbulb,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  User,
  Zap,
} from "lucide-react";
import { api, streamChat } from "../api";
import type { ChatMessage, FinalChatEvent, Metrics, QueryOptions } from "../types";
import { ErrorBanner, Markdown, Spinner } from "./ui";

interface ChatProps {
  collection: string;
  conversationId: string | null;
  queryOptions: QueryOptions;
  onConversation: (id: string) => void;
  onThreadsChanged: () => void;
  onNotice: (message: string) => void;
}

const suggestions = [
  "Summarize the key ideas in these documents",
  "What are the most important findings?",
  "Compare the main topics in this collection",
];

export function MessageMetrics({
  metrics,
  streaming = false,
}: {
  metrics: Metrics;
  streaming?: boolean;
}) {
  const tpsTitle = streaming
    ? "Best-effort live estimate from streamed text and elapsed request time, including retrieval and other RAG work."
    : "Final backend metrics for the completed request.";
  return (
    <div
      className={`metrics-row${streaming ? " live" : ""}`}
      aria-label={streaming ? "Live estimated chat performance" : "Final chat performance"}
    >
      <span><Zap size={13} />{metrics.total_tokens ?? 0} tokens</span>
      <span><Clock3 size={13} />{metrics.duration ?? 0}s</span>
      <span className="tps-metric" title={tpsTitle}>
        {metrics.tokens_per_second ?? 0} tokens/s{streaming ? " est." : ""}
      </span>
      {streaming && <span className="metrics-live-label">Live estimate</span>}
    </div>
  );
}

export function Chat({
  collection,
  conversationId,
  queryOptions,
  onConversation,
  onThreadsChanged,
  onNotice,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    void api.messages(conversationId).then((result) => {
      if (active) setMessages(result.messages);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Could not load messages.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: sending ? "smooth" : "auto", block: "end" });
  }, [messages, sending]);

  const updateAssistant = (id: string, update: (message: ChatMessage) => ChatMessage) => {
    setMessages((current) => current.map((message) => message.id === id ? update(message) : message));
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = input.trim();
    if (!question || sending || !conversationId) return;

    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    abortRef.current = controller;
    let finalReceived = false;
    setInput("");
    setError("");
    setSending(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: question },
      { id: assistantId, role: "assistant", content: "", reasoning: "", streaming: true },
    ]);

    try {
      await streamChat(
        collection,
        conversationId,
        question,
        queryOptions,
        {
          onMeta: onConversation,
          onReasoning: (text) => updateAssistant(assistantId, (message) => ({
            ...message,
            reasoning: `${message.reasoning || ""}${text}`,
          })),
          onAnswer: (text) => updateAssistant(assistantId, (message) => ({
            ...message,
            content: message.content + text,
          })),
          onMetrics: (metrics) => updateAssistant(assistantId, (message) => ({
            ...message,
            metrics,
          })),
          onFinal: (result: FinalChatEvent) => {
            finalReceived = true;
            updateAssistant(assistantId, (message) => ({
              ...message,
              content: result.answer,
              reasoning: result.reasoning,
              optimization_log: result.optimization_log,
              sources: result.sources,
              metrics: result.metrics,
              qa_run_id: result.qa_run_id,
              streaming: false,
            }));
            if (result.persistence_error) onNotice("Answer received, but persistence failed.");
          },
        },
        controller.signal,
      );
      if (!finalReceived) throw new Error("The response ended without a final answer.");
      onThreadsChanged();
    } catch (caught) {
      const aborted = caught instanceof DOMException && caught.name === "AbortError";
      updateAssistant(assistantId, (message) => ({
        ...message,
        streaming: false,
        metrics: undefined,
        error: !aborted,
        content: aborted
          ? message.content || "Generation stopped."
          : caught instanceof Error ? caught.message : "Could not generate an answer.",
      }));
      if (!aborted) setError(caught instanceof Error ? caught.message : "Chat failed.");
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  const rate = async (message: ChatMessage, rating: "like" | "dislike") => {
    if (!message.qa_run_id) return;
    try {
      await api.rateQARun(message.qa_run_id, rating);
      updateAssistant(String(message.id), (current) => ({ ...current, rated: rating }));
    } catch (caught) {
      onNotice(caught instanceof Error ? caught.message : "Could not save rating.");
    }
  };

  return (
    <section className="chat-workspace">
      <div className="chat-scroll">
        {loading ? <div className="center-loading"><Spinner label="Loading conversation" /></div> : (
          <>
            {!messages.length && (
              <div className="chat-welcome">
                <div className="welcome-orbit"><Sparkles size={29} /></div>
                <span className="eyebrow">Grounded in {collection}</span>
                <h1>What would you like to know?</h1>
                <p>Ask about your documents. Answers include sources, retrieval reasoning, and performance metrics.</p>
                <div className="suggestion-grid">
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => setInput(suggestion)}>
                      <Lightbulb size={17} /><span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="message-list">
              {messages.map((message) => (
                <article className={`message ${message.role} ${message.error ? "error" : ""}`} key={message.id}>
                  <div className="message-avatar">{message.role === "user" ? <User size={18} /> : <Bot size={19} />}</div>
                  <div className="message-content">
                    <div className="message-author">{message.role === "user" ? "You" : "RAG Assistant"}
                      {message.streaming && <span className="streaming-label"><span className="status-dot online" />Generating</span>}
                    </div>

                    {message.reasoning && (
                      <details className="reasoning" open={message.streaming && !message.content}>
                        <summary><Sparkles size={14} />Reasoning<ChevronDown size={14} /></summary>
                        <div>{message.reasoning.replaceAll("REASONING:", "").replaceAll("ANSWER:", "").trim()}</div>
                      </details>
                    )}

                    {message.content ? (
                      message.role === "assistant" && !message.error
                        ? <Markdown>{message.content}</Markdown>
                        : <div className="plain-message">{message.content}</div>
                    ) : message.streaming && !message.reasoning ? (
                      <div className="thinking"><span /><span /><span />Searching and thinking</div>
                    ) : null}

                    {message.optimization_log && (
                      <details className="optimization"><summary>Query optimization</summary><Markdown>{message.optimization_log}</Markdown></details>
                    )}

                    {!!message.sources?.length && (
                      <div className="source-row">
                        <span>Sources</span>
                        {message.sources.map((source) => <span className="source-chip" key={source}><FileText size={13} />{source}</span>)}
                      </div>
                    )}

                    {message.metrics && (
                      <MessageMetrics metrics={message.metrics} streaming={message.streaming} />
                    )}

                    {message.role === "assistant" && message.qa_run_id && !message.streaming && (
                      <div className="rating-row">
                        <span>{message.rated ? "Thanks for your feedback" : "Was this answer useful?"}</span>
                        {!message.rated && <>
                          <button className="icon-button" onClick={() => void rate(message, "like")} aria-label="Like answer"><ThumbsUp size={15} /></button>
                          <button className="icon-button" onClick={() => void rate(message, "dislike")} aria-label="Dislike answer"><ThumbsDown size={15} /></button>
                        </>}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        <div ref={endRef} />
      </div>

      <div className="composer-wrap">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <form className="composer" onSubmit={(event) => void send(event)}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={`Ask ${collection} a question…`}
            rows={1}
            disabled={!conversationId || sending}
            aria-label="Your question"
          />
          {sending ? (
            <button type="button" className="send-button stop" onClick={() => abortRef.current?.abort()} aria-label="Stop generation"><Square size={17} /></button>
          ) : (
            <button className="send-button" disabled={!input.trim() || !conversationId} aria-label="Send question"><Send size={18} /></button>
          )}
        </form>
        <div className="composer-note">Enter to send · Shift + Enter for a new line · Answers are grounded in your collection</div>
      </div>
    </section>
  );
}
