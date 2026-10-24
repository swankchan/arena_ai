import { afterEach, describe, expect, it, vi } from "vitest";
import { streamChat } from "../api";
import { readSSE, type SSEEvent } from "./sse";

afterEach(() => vi.unstubAllGlobals());

function chunkedResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }));
}

describe("readSSE", () => {
  it("parses events across arbitrary network chunk boundaries", async () => {
    const events: SSEEvent[] = [];
    await readSSE(chunkedResponse([
      "event: meta\nda",
      "ta: {\"conversation_id\":\"abc\"}\n\nevent: answer\r\n",
      "data: {\"text\":\"Hello",
      " world\"}\r\n\r\n",
    ]), (event) => events.push(event));

    expect(events).toEqual([
      { event: "meta", data: { conversation_id: "abc" } },
      { event: "answer", data: { text: "Hello world" } },
    ]);
  });

  it("normalizes CRLF delimiters split between chunks", async () => {
    const events: SSEEvent[] = [];
    await readSSE(chunkedResponse([
      "event: answer\r",
      "\ndata: {\"text\":\"ok\"}\r",
      "\n\r",
      "\n",
    ]), (event) => events.push(event));
    expect(events).toEqual([{ event: "answer", data: { text: "ok" } }]);
  });

  it("preserves unicode and JSON newlines", async () => {
    const events: SSEEvent[] = [];
    await readSSE(chunkedResponse([
      "event: final\ndata: {\"answer\":\"你好\\n世界\"}\n\n",
    ]), (event) => events.push(event));
    expect(events[0].data).toEqual({ answer: "你好\n世界" });
  });
});

describe("streamChat metrics", () => {
  it("forwards live metrics between answer and unchanged final events", async () => {
    const live = { total_tokens: 3, tokens_per_second: 7.5, duration: 0.4 };
    const final = {
      conversation_id: "conversation-1",
      qa_run_id: 1,
      answer: "Hello",
      reasoning: "",
      optimization_log: "",
      sources: [],
      metrics: { total_tokens: 4, tokens_per_second: 5, duration: 0.8 },
      route: "rag",
      persistence_error: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(chunkedResponse([
      "event: answer\ndata: {\"text\":\"Hello\"}\n\n",
      `event: metrics\ndata: ${JSON.stringify(live)}\n\n`,
      `event: final\ndata: ${JSON.stringify(final)}\n\n`,
    ]));
    vi.stubGlobal("fetch", fetchMock);
    const onAnswer = vi.fn();
    const onMetrics = vi.fn();
    const onFinal = vi.fn();

    await streamChat(
      "alpha",
      "conversation-1",
      "Question",
      { query_transformation: false, query_expansion: false },
      { onReasoning: vi.fn(), onAnswer, onMetrics, onFinal },
    );

    expect(onAnswer).toHaveBeenCalledWith("Hello");
    expect(onMetrics).toHaveBeenCalledWith(live);
    expect(onFinal).toHaveBeenCalledWith(final);
    expect(onAnswer.mock.invocationCallOrder[0]).toBeLessThan(onMetrics.mock.invocationCallOrder[0]);
    expect(onMetrics.mock.invocationCallOrder[0]).toBeLessThan(onFinal.mock.invocationCallOrder[0]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/collections/alpha/chat");
  });
});
