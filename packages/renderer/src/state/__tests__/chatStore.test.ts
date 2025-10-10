import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/chatApi", () => ({
  fetchChatHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock("../flowStore", async () => {
  const { create } = await import("zustand");
  const store = create(() => ({
    runBuiltFlow: async () => ({ ok: true, runId: "mock-run" }),
  }));
  return { useFlowStore: store };
});

const { useChatStore } = await import("../chatStore");
const { useFlowStore } = await import("../flowStore");

const resetChatState = () => {
  useChatStore.setState({
    threads: {},
    activeNodeId: null,
    flowAcceptsInput: true,
  });
};

describe("chatStore.sendDraft", () => {
  beforeEach(() => {
    resetChatState();
  });

  it("runs the compiled flow and retains the user message on success", async () => {
    const runBuiltFlowMock = vi.fn().mockImplementation(async () => {
      expect(useChatStore.getState().flowAcceptsInput).toBe(false);
      return { ok: true, runId: "run-success" };
    });
    useFlowStore.setState({ runBuiltFlow: runBuiltFlowMock as any });

    const store = useChatStore.getState();
    store.openChat({ nodeId: "interface-1", nodeLabel: "Interface" });
    store.setDraft("interface-1", "Hello world");

    const result = await store.sendDraft("interface-1");

    expect(result).toBe(true);
    expect(runBuiltFlowMock).toHaveBeenCalledTimes(1);

    const thread = useChatStore.getState().threads["interface-1"];
    expect(thread).toBeDefined();
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0]?.role).toBe("user");
    expect(thread.messages[0]?.content).toBe("Hello world");
    expect(thread.isSending).toBe(false);
    expect(thread.draft).toBe("");
    expect(useChatStore.getState().flowAcceptsInput).toBe(true);
  });

  it("restores the draft and reports an error when the flow run fails", async () => {
    const runBuiltFlowMock = vi.fn().mockResolvedValue({ ok: false, error: "Build the flow first" });
    useFlowStore.setState({ runBuiltFlow: runBuiltFlowMock as any });

    const store = useChatStore.getState();
    store.openChat({ nodeId: "interface-2", nodeLabel: "Interface" });
    store.setDraft("interface-2", "Echo this back");

    const result = await store.sendDraft("interface-2");

    expect(result).toBe(false);
    expect(runBuiltFlowMock).toHaveBeenCalledTimes(1);

    const thread = useChatStore.getState().threads["interface-2"];
    expect(thread).toBeDefined();
    expect(thread.messages).toHaveLength(0);
    expect(thread.draft).toBe("Echo this back");
    expect(thread.isSending).toBe(false);
    expect(thread.notice).toContain("Build the flow first");
    expect(useChatStore.getState().flowAcceptsInput).toBe(true);
  });

  it("handles thrown errors from the flow runner", async () => {
    const runBuiltFlowMock = vi.fn().mockRejectedValue(new Error("execution failed"));
    useFlowStore.setState({ runBuiltFlow: runBuiltFlowMock as any });

    const store = useChatStore.getState();
    store.openChat({ nodeId: "interface-3", nodeLabel: "Interface" });
    store.setDraft("interface-3", "Test input");

    const result = await store.sendDraft("interface-3");

    expect(result).toBe(false);
    expect(runBuiltFlowMock).toHaveBeenCalledTimes(1);

    const thread = useChatStore.getState().threads["interface-3"];
    expect(thread).toBeDefined();
    expect(thread.messages).toHaveLength(0);
    expect(thread.draft).toBe("Test input");
    expect(thread.notice).toContain("execution failed");
    expect(useChatStore.getState().flowAcceptsInput).toBe(true);
  });
});

