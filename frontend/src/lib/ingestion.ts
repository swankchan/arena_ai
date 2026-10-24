import type { IngestionJob } from "../types";

type IngestionTotals = Pick<
  IngestionJob,
  | "processed_files"
  | "total_files"
  | "vector_files"
  | "tabular_files"
  | "total_chunks"
  | "total_rows"
>;

function outcomes(job: IngestionTotals): string[] {
  const result: string[] = [];
  if (job.vector_files > 0) {
    result.push(`${job.total_chunks} vector chunk${job.total_chunks === 1 ? "" : "s"}`);
  }
  if (job.tabular_files > 0) {
    result.push(`${job.total_rows} tabular row${job.total_rows === 1 ? "" : "s"}`);
  }
  return result;
}

export function formatIngestionCounts(job: IngestionTotals): string {
  return [
    `${job.processed_files}/${job.total_files} files`,
    ...outcomes(job),
  ].join(" · ");
}

export function formatIngestionCompletion(job: IngestionTotals): string {
  const processed = `Processed ${job.processed_files} file${job.processed_files === 1 ? "" : "s"}`;
  const details = outcomes(job);
  return details.length ? `${processed}: ${details.join(" and ")}.` : `${processed}.`;
}
