import { describe, expect, it } from "vitest";
import { formatBytes, toCSV } from "./format";

describe("format helpers", () => {
  it("escapes CSV cells and uses a stable column union", () => {
    expect(toCSV([
      { name: "Hong, Kong", amount: 2 },
      { name: 'Quote "here"', note: "line\nbreak" },
    ])).toBe(
      '"name","amount","note"\n"Hong, Kong","2",""\n"Quote ""here""","","line\nbreak"',
    );
  });

  it("formats upload sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
  });
});
