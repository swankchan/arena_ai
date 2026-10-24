export type WorkspaceTab = "ask" | "history" | "documents" | "tabular" | "prompts" | "about";

export interface PublicConfig {
  supported_extensions: string[];
  max_upload_size_mb: number;
  embedding_model: string;
  embedding_dimensions: number;
  chunking_strategy: string;
  chunk_size: number;
  chunk_overlap: number;
  reranking: boolean;
  rerank_model: string;
  query_transformation: boolean;
  query_expansion: boolean;
  llm: {
    provider: string;
    model: string;
    base_url: string;
  };
}

export interface Conversation {
  id: string;
  collection_name?: string;
  name: string | null;
  created_at: number;
  message_count?: number;
  last_active?: number | null;
}

export interface CollectionSummary {
  collection: string;
  summary: string;
  updated_at: number | null;
}

export interface ChatMessage {
  id?: number | string;
  role: "user" | "assistant";
  content: string;
  qa_run_id?: number | null;
  created_at?: number;
  reasoning?: string;
  optimization_log?: string;
  sources?: string[];
  metrics?: Metrics;
  streaming?: boolean;
  rated?: "like" | "dislike";
  error?: boolean;
}

export interface Metrics {
  total_tokens?: number;
  tokens_per_second?: number;
  duration?: number;
}

export interface QueryOptions {
  query_transformation: boolean;
  query_expansion: boolean;
}

export interface FinalChatEvent {
  conversation_id: string;
  qa_run_id: number | null;
  answer: string;
  reasoning: string;
  optimization_log: string;
  sources: string[];
  metrics: Metrics;
  route: "rag" | "smalltalk";
  // Smalltalk keeps sources empty and has no Q&A/rating/memory entry.
  persistence_error: string | null;
}

export interface DocumentItem {
  source: string;
  name: string;
}

export interface IngestionFileResult {
  name: string;
  kind: "vector" | "tabular";
  status: "succeeded" | "failed";
  chunks?: number;
  rows?: number;
  columns?: number;
  error?: string;
}

export interface IngestionJob {
  id: string;
  collection: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progress: number;
  filenames: string[];
  processed_files: number;
  total_files: number;
  vector_files: number;
  tabular_files: number;
  total_chunks: number;
  total_rows: number;
  file_results: IngestionFileResult[];
  errors: string[];
  summary_error?: string | null;
  created_at: number;
  updated_at: number;
}

export interface QARunSummary {
  id: number;
  conversation_id: string;
  question: string;
  answer_preview: string;
  created_at: number;
}

export interface QARun {
  id: number;
  conversation_id: string;
  collection_name: string;
  question: string;
  answer: string;
  created_at: number;
  sources: string[];
  metrics: Metrics;
  optimization_log: string;
  engine_key: string;
  rating: { rating: "like" | "dislike"; comment?: string } | null;
}

export interface Prompt {
  id: number;
  name: string;
  content: string;
  enabled: boolean;
  created_at: number;
}

export interface TabularFile {
  id: number;
  collection_name: string;
  filename: string;
  table_name: string;
  row_count: number;
  columns: Record<string, { type?: string; category?: string; null_count?: number }>;
  created_at: number;
}

export interface SQLResult {
  columns?: string[];
  rows: Record<string, unknown>[];
  row_count?: number;
  results_count?: number;
  truncated?: boolean;
  sql_used?: boolean;
  sql_query?: string;
  sql_generation_log?: string;
  error?: string;
}
