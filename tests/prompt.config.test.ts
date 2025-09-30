import { describe, expect, it } from "vitest";

import {
  defaultPromptConfig,
  promptConfigFromBytes,
  promptConfigToBytes,
} from "../src/modules/prompt/promptConfig";
import { PROMPT_PRESET_MAP } from "@voide/shared";

function toBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

describe("promptConfig conversion", () => {
  it("returns default config when bytes are missing", () => {
    const cfg = promptConfigFromBytes();
    expect(cfg).toEqual(defaultPromptConfig);
  });

  it("parses valid bytes and preserves passthrough", () => {
    const bytes = toBytes({
      text: "Hello",
<<<<<<< ours
      to: "system",
      preset: "assistant",
=======
      preset: "custom",
      to: "system",
>>>>>>> theirs
      custom: 42,
    });
    const cfg = promptConfigFromBytes(bytes);
    expect(cfg.text).toBe("Hello");
    expect(cfg.preset).toBe("custom");
    expect(cfg.to).toBe("system");
    expect(cfg.preset).toBe("assistant");
    expect(cfg.passthrough.custom).toBe(42);
  });

  it("migrates legacy template/tone fields", () => {
    const bytes = toBytes({
      template: PROMPT_PRESET_MAP.analysis.defaultText,
      tone: "neutral",
    });
    const cfg = promptConfigFromBytes(bytes);
    expect(cfg.preset).toBe("analysis");
    expect(cfg.text).toBe(PROMPT_PRESET_MAP.analysis.defaultText);
  });

  it("falls back on invalid shapes", () => {
    const bytes = toBytes("oops");
    const cfg = promptConfigFromBytes(bytes);
    expect(cfg).toEqual(defaultPromptConfig);
  });

  it("encodes state with passthrough merged", () => {
    const start = promptConfigFromBytes(
      toBytes({ text: "A", preset: "custom", to: "user", extra: "value" })
    );
    start.text = "Updated";
    start.to = "system";
    start.preset = "custom";
    const encoded = promptConfigToBytes(start);
    const decoded = JSON.parse(new TextDecoder().decode(encoded));
    expect(decoded).toMatchObject({
      text: "Updated",
<<<<<<< ours
      to: "system",
      preset: "custom",
      extra: "value",
    });
  });

  it("encodes and decodes preset overrides", () => {
    const initial = promptConfigFromBytes(
      toBytes({ text: "", to: "user", preset: "engineer" })
    );
    expect(initial.preset).toBe("engineer");

    const encoded = promptConfigToBytes(initial);
    const decoded = promptConfigFromBytes(encoded);
    expect(decoded.preset).toBe("engineer");
    expect(decoded.text).toBe("");
=======
      preset: "custom",
      to: "system",
      extra: "value",
    });
>>>>>>> theirs
  });
});

