import { describe, expect, it } from "vitest";
import {
  AnyBlob,
  TypeRegistry,
  UserText,
  PromptText,
  LLMText,
} from "../src/runtime/types";

describe("TypeRegistry", () => {
  const registry = new TypeRegistry();

  it("encodes and decodes UserText", () => {
    const value: UserText = { text: "hello" };
    const bin = registry.encode("UserText", value);
    expect(bin).toBeInstanceOf(Uint8Array);
    const decoded = registry.decode("UserText", bin) as UserText;
    expect(decoded).toEqual(value);
  });

  it("encodes and decodes PromptText and LLMText", () => {
    const p: PromptText = { text: "prompt" };
    const pbin = registry.encode("PromptText", p);
    expect(registry.decode("PromptText", pbin)).toEqual(p);

    const l: LLMText = { text: "reply" };
    const lbin = registry.encode("LLMText", l);
    expect(registry.decode("LLMText", lbin)).toEqual(l);
  });

  it("encodes and decodes AnyBlob", () => {
    const blob: AnyBlob = { data: new Uint8Array([1, 2, 3]) };
    const bin = registry.encode("AnyBlob", blob);
    expect(Array.from(bin)).toEqual([1, 2, 3]);
    const decoded = registry.decode("AnyBlob", bin) as AnyBlob;
    expect(Array.from(decoded.data)).toEqual([1, 2, 3]);
  });

  it("falls back to AnyBlob for ext:* types", () => {
    const bytes = new Uint8Array([9, 8]);
    const bin = registry.encode("ext:custom", { data: bytes });
    expect(Array.from(bin)).toEqual([9, 8]);
    const decoded = registry.decode("ext:custom", bin) as AnyBlob;
    expect(Array.from(decoded.data)).toEqual([9, 8]);
  });

  it("throws for unknown non-ext type", () => {
    expect(() => registry.encode("Unknown" as any, { text: "x" })).toThrow();
  });
});

