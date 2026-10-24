import type {
  ChatMessage,
  Conversation,
  DocumentItem,
  FinalChatEvent,
  IngestionJob,
  Prompt,
  PublicConfig,
  QARun,
  QARunSummary,
  QueryOptions,
  SQLResult,
  TabularFile,
} from "./types";
import { readSSE } from "./lib/sse";

const API = "/api";

export class APIError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

async function errorFrom(response: Response): Promise<APIError> {
  let message = `Request failed (${response.status})`;
  try {
    const body = await response.json();
    if (typeof body.detail === "string") message = body.detail;
    else if (body.detail) message = JSON.stringify(body.detail);
  } catch {
    // Keep the HTTP status message when the response is not JSON.
  }
  return new APIError(message, response.status);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (!response.ok) throw await errorFrom(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function json(method: string, body?: unknown): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) };
}

const collectionPath = (name: string) => `/collections/${encodeURIComponent(name)}`;

export const api = {
  health: () => request<{ status: string }>("/health"),
  config: () => request<PublicConfig>("/config"),

  listCollections: () => request<{ collections: string[] }>("/collections"),
  createCollection: (name: string) =>
    request<{ name: string; created: boolean }>("/collections", json("POST", { name })),
  renameCollection: (name: string, newName: string) =>
    request<{ name: string }>(collectionPath(name), json("PATCH", { new_name: newName })),
  deleteCollection: (name: string) =>
    request<{ deleted: string }>(collectionPath(name), json("DELETE", { confirmation: name })),

  listDocuments: (collection: string) =>
    request<{ documents: DocumentItem[] }>(`${collectionPath(collection)}/documents`),
  deleteDocument: (collection: string, source: string) =>
    request<{ deleted_chunks: number }>(
      `${collectionPath(collection)}/documents?source=${encodeURIComponent(source)}`,
      { method: "DELETE" },
    ),
  uploadDocuments: (collection: string, files: File[]) => {
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    return request<IngestionJob>(`${collectionPath(collection)}/documents`, {
      method: "POST",
      body,
    });
  },
  job: (id: string) => request<IngestionJob>(`/jobs/${encodeURIComponent(id)}`),

  listConversations: (collection: string) =>
    request<{ conversations: Conversation[] }>(`${collectionPath(collection)}/conversations`),
  createConversation: (collection: string, name?: string) =>
    request<Conversation>(`${collectionPath(collection)}/conversations`, json("POST", { name })),
  messages: (conversationId: string) =>
    request<{ messages: ChatMessage[] }>(`/conversations/${encodeURIComponent(conversationId)}/messages`),
  deleteConversation: (conversationId: string) =>
    request<{ deleted: string }>(`/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE" }),

  listQARuns: (collection: string) =>
    request<{ qa_runs: QARunSummary[] }>(`${collectionPath(collection)}/qa-runs?limit=50`),
  qaRun: (id: number) => request<QARun>(`/qa-runs/${id}`),
  deleteQARun: (id: number) => request<{ deleted: number }>(`/qa-runs/${id}`, { method: "DELETE" }),
  rateQARun: (id: number, rating: "like" | "dislike") =>
    request<{ rating: string }>(`/qa-runs/${id}/rating`, json("PUT", { rating })),

  listPrompts: () => request<{ prompts: Prompt[] }>("/prompts"),
  createPrompt: (name: string, content: string, enabled = true) =>
    request<Prompt>("/prompts", json("POST", { name, content, enabled })),
  setPromptEnabled: (id: number, enabled: boolean) =>
    request<Prompt>(`/prompts/${id}`, json("PATCH", { enabled })),
  deletePrompt: (id: number) => request<{ deleted: number }>(`/prompts/${id}`, { method: "DELETE" }),

  listTabularFiles: (collection: string) =>
    request<{ files: TabularFile[] }>(`${collectionPath(collection)}/tabular/files`),
  deleteTabularFile: (collection: string, id: number) =>
    request<{ deleted: number }>(`${collectionPath(collection)}/tabular/files/${id}`, { method: "DELETE" }),
  querySQL: (collection: string, fileId: number, query: string) =>
    request<SQLResult>(`${collectionPath(collection)}/tabular/query`, json("POST", { file_id: fileId, query })),
  queryNatural: (collection: string, fileId: number, question: string) =>
    request<SQLResult>(`${collectionPath(collection)}/tabular/query/natural`, json("POST", {
      file_id: fileId,
      question,
    })),
};

interface StreamCallbacks {
  onMeta?: (conversationId: string) => void;
  onReasoning: (text: string) => void;
  onAnswer: (text: string) => void;
  onFinal: (result: FinalChatEvent) => void;
}

export async function streamChat(
  collection: string,
  conversationId: string | null,
  question: string,
  options: QueryOptions,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API}${collectionPath(collection)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      question,
      ...options,
    }),
    signal,
  });
  if (!response.ok) throw await errorFrom(response);

  await readSSE(response, ({ event, data }) => {
    if (event === "meta") {
      callbacks.onMeta?.((data as { conversation_id: string }).conversation_id);
    } else if (event === "reasoning") {
      callbacks.onReasoning((data as { text: string }).text);
    } else if (event === "answer") {
      callbacks.onAnswer((data as { text: string }).text);
    } else if (event === "final") {
      callbacks.onFinal(data as FinalChatEvent);
    } else if (event === "error") {
      throw new APIError((data as { detail: string }).detail);
    }
  });
}
