import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageMetrics } from "./Chat";

const metrics = { total_tokens: 12, duration: 1.5, tokens_per_second: 8.25 };

describe("MessageMetrics", () => {
  it("labels streaming tokens per second as a live estimate", () => {
    const html = renderToStaticMarkup(<MessageMetrics metrics={metrics} streaming />);
    expect(html).toContain("12 tokens");
    expect(html).toContain("1.5s");
    expect(html).toContain("8.25 tokens/s est.");
    expect(html).toContain("Live estimate");
    expect(html).toContain("including retrieval and other RAG work");
    expect(html).toContain('aria-label="Live estimated chat performance"');
  });

  it("keeps completed metrics distinct from the live estimate", () => {
    const html = renderToStaticMarkup(<MessageMetrics metrics={metrics} />);
    expect(html).toContain("8.25 tokens/s");
    expect(html).toContain('aria-label="Final chat performance"');
    expect(html).not.toContain("Live estimate");
    expect(html).not.toContain("tokens/s est.");
  });
});
