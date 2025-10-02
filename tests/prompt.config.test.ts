import { describe, expect, it, vi } from "vitest";

vi.mock("@voide/shared", async () => {
  return await import("../packages/shared/src/promptPresets");
});

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
      preset: "custom",
      to: "system",
      custom: 42,
    });
    const cfg = promptConfigFromBytes(bytes);
    expect(cfg.text).toBe("Hello");
    expect(cfg.preset).toBe("custom");
    expect(cfg.to).toBe("system");
    expect(cfg.passthrough.custom).toBe(42);
  });

  it("coerces unknown presets to custom", () => {
    const cfg = promptConfigFromBytes(
      toBytes({ text: "Hello", preset: "assistant", to: "user" })
    );
    expect(cfg.preset).toBe("custom");
    expect(cfg.text).toBe("Hello");
    expect(cfg.to).toBe("user");
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
      toBytes({ text: "A", preset: "custom", to: "user", extra: "value" }),
    );
    start.text = "Updated";
    start.to = "system";
    start.preset = "custom";
    const encoded = promptConfigToBytes(start);
    const decoded = JSON.parse(new TextDecoder().decode(encoded));
    expect(decoded).toMatchObject({
      text: "Updated",
      preset: "custom",
      to: "system",
      extra: "value",
    });
  });

  it("round-trips recognized presets", () => {
    const initial = promptConfigFromBytes(

      toBytes({ text: "", to: "user", preset: "analysis" })
    );
    expect(initial.preset).toBe("analysis");

    const encoded = promptConfigToBytes(initial);
    const decoded = promptConfigFromBytes(encoded);
    expect(decoded.preset).toBe("analysis");
    expect(decoded.text).toBe(PROMPT_PRESET_MAP.analysis.defaultText);
  });
});
