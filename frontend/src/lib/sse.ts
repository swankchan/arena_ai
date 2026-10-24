export interface SSEEvent {
  event: string;
  data: unknown;
}

function parseBlock(block: string): SSEEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  return { event, data: JSON.parse(data.join("\n")) };
}

export async function readSSE(
  response: Response,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  if (!response.body) throw new Error("Streaming is not supported by this browser.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    // Normalize after appending so CRLF split across network chunks is safe.
    buffer = buffer.replaceAll("\r\n", "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseBlock(block);
      if (parsed) onEvent(parsed);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }

  if (buffer.trim()) {
    const parsed = parseBlock(buffer);
    if (parsed) onEvent(parsed);
  }
}
