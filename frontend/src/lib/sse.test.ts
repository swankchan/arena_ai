import { describe, expect, it } from "vitest";
import { readSSE, type SSEEvent } from "./sse";

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
