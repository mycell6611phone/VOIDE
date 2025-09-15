import { describe, it, expect, vi, beforeEach } from "vitest";
import * as runtime from "../src/modules/debate/runtime";
import { executeDebate, setLlmRequest } from "../src/modules/debate/runtime";
import {
  DebateConfig,
  DebateFormat,
} from "../src/modules/debate/debateConfig";

describe("executeDebate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles SINGLE_PASS_VALIDATE", async () => {
    setLlmRequest(vi.fn().mockResolvedValue("ok"));
    const cfg: DebateConfig = {
      debateFormat: DebateFormat.SINGLE_PASS_VALIDATE,
      customPrompt: "",
      roundNumber: 1,
      iterativeLoop: false,
      loopTargetModuleId: "",
    };
    const out = await executeDebate({ text: "hello", meta: {} }, cfg);
    expect(out.text).toBe("ok");
  });

  it("handles CONCISENESS_MULTI_PASS", async () => {
    const mockFn = vi
      .fn()
      .mockResolvedValueOnce("reasoning")
      .mockResolvedValueOnce("compressed");
    setLlmRequest(mockFn);
    const cfg: DebateConfig = {
      debateFormat: DebateFormat.CONCISENESS_MULTI_PASS,
      customPrompt: "",
      roundNumber: 1,
      iterativeLoop: false,
      loopTargetModuleId: "",
    };
    const out = await executeDebate({ text: "hi", meta: {} }, cfg);
    expect(out.text).toBe("compressed");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("handles DEBATE_ADD_ON", async () => {
    const mockFn = vi
      .fn()
      .mockResolvedValueOnce("base")
      .mockResolvedValueOnce("refined");
    setLlmRequest(mockFn);
    const cfg: DebateConfig = {
      debateFormat: DebateFormat.DEBATE_ADD_ON,
      customPrompt: "",
      roundNumber: 1,
      iterativeLoop: false,
      loopTargetModuleId: "",
    };
    const out = await executeDebate({ text: "x", meta: {} }, cfg);
    expect(out.text).toBe("refined");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("handles CUSTOM", async () => {
    const mockFn = vi.fn().mockResolvedValue("custom");
    setLlmRequest(mockFn);
    const cfg: DebateConfig = {
      debateFormat: DebateFormat.CUSTOM,
      customPrompt: "PROMPT {{input}}",
      roundNumber: 1,
      iterativeLoop: false,
      loopTargetModuleId: "",
    };
    const out = await executeDebate({ text: "ZZ", meta: {} }, cfg);
    expect(out.text).toBe("custom");
    expect(mockFn).toHaveBeenCalledWith("PROMPT ZZ", undefined);
  });

  it("emits loop meta when iterative_loop is true", async () => {
    setLlmRequest(vi.fn().mockResolvedValue("res"));
    const cfg: DebateConfig = {
      debateFormat: DebateFormat.SINGLE_PASS_VALIDATE,
      customPrompt: "",
      roundNumber: 2,
      iterativeLoop: true,
      loopTargetModuleId: "next123",
    };
    const out = await executeDebate({ text: "t", meta: {} }, cfg);
    expect(out.meta.next_module).toBe("next123");
    expect(out.meta.round).toBe(3);
  });
});

