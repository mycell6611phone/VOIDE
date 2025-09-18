import { describe, expect, it } from "vitest";

import {
  defaultPromptConfig,
  promptConfigFromBytes,
  promptConfigToBytes,
} from "../src/modules/prompt/promptConfig";

function toBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

describe("promptConfig conversion", () => {
  it("returns default config when bytes are missing", () => {
    const cfg = promptConfigFromBytes();
    expect(cfg).toEqual(defaultPromptConfig);
  });

  it("parses valid bytes and preserves passthrough", () => {
    const bytes = toBytes({ text: "Hello", to: "system", custom: 42 });
    const cfg = promptConfigFromBytes(bytes);
    expect(cfg.text).toBe("Hello");
    expect(cfg.to).toBe("system");
    expect(cfg.passthrough.custom).toBe(42);
  });

  it("falls back on invalid shapes", () => {
    const bytes = toBytes("oops");
    const cfg = promptConfigFromBytes(bytes);
    expect(cfg).toEqual(defaultPromptConfig);
  });

  it("encodes state with passthrough merged", () => {
    const start = promptConfigFromBytes(
      toBytes({ text: "A", to: "user", extra: "value" })
    );
    start.text = "Updated";
    start.to = "system";
    const encoded = promptConfigToBytes(start);
    const decoded = JSON.parse(new TextDecoder().decode(encoded));
    expect(decoded).toMatchObject({ text: "Updated", to: "system", extra: "value" });
  });
});

