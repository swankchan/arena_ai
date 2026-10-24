import { describe, expect, it } from "vitest";
import { formatIngestionCompletion, formatIngestionCounts } from "./ingestion";

const totals = {
  processed_files: 1,
  total_files: 1,
  vector_files: 0,
  tabular_files: 0,
  total_chunks: 0,
  total_rows: 0,
};

describe("ingestion result formatting", () => {
  it("labels vector output as chunks", () => {
    const job = { ...totals, vector_files: 1, total_chunks: 3 };
    expect(formatIngestionCounts(job)).toBe("1/1 files · 3 vector chunks");
    expect(formatIngestionCompletion(job)).toBe("Processed 1 file: 3 vector chunks.");
  });

  it("reports a successful empty table as zero rows, not zero chunks", () => {
    const job = { ...totals, tabular_files: 1 };
    expect(formatIngestionCounts(job)).toBe("1/1 files · 0 tabular rows");
    expect(formatIngestionCompletion(job)).toBe("Processed 1 file: 0 tabular rows.");
    expect(formatIngestionCompletion(job)).not.toContain("chunks");
  });

  it("keeps vector and tabular totals distinct in mixed batches", () => {
    const job = {
      ...totals,
      processed_files: 2,
      total_files: 2,
      vector_files: 1,
      tabular_files: 1,
      total_chunks: 4,
      total_rows: 25,
    };
    expect(formatIngestionCounts(job)).toBe(
      "2/2 files · 4 vector chunks · 25 tabular rows",
    );
    expect(formatIngestionCompletion(job)).toBe(
      "Processed 2 files: 4 vector chunks and 25 tabular rows.",
    );
  });
});
