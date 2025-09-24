import { beforeEach, describe, expect, it } from "vitest";
import type { FlowDef, NodeDef } from "@voide/shared";
import { useFlowStore } from "../flowStore";

const createLLMNode = (): NodeDef => ({
  id: "llm-node",
  type: "llm",
  name: "LLM",
  params: {},
  in: [],
  out: []
});

const createModuleNode = (): NodeDef => ({
  id: "module-node",
  type: "module",
  name: "Prompt",
  params: {},
  in: [],
  out: []
});

const baseFlow: FlowDef = {
  id: "flow-test",
  version: "1.0.0",
  nodes: [createLLMNode(), createModuleNode()],
  edges: []
};

const cloneFlow = (): FlowDef => ({
  ...baseFlow,
  nodes: baseFlow.nodes.map((node) => ({
    ...node,
    params: { ...(node.params ?? {}) },
    in: node.in.map((port) => ({ ...port })),
    out: node.out.map((port) => ({ ...port }))
  })),
  edges: baseFlow.edges.map((edge) => ({
    ...edge,
    from: [...edge.from] as [string, string],
    to: [...edge.to] as [string, string]
  }))
});

const getNodeName = (id: string) => {
  const { flow } = useFlowStore.getState();
  return flow.nodes.find((node) => node.id === id)?.name;
};

describe("flowStore.updateNodeParams", () => {
  beforeEach(() => {
    useFlowStore.setState((state) => ({
      ...state,
      flow: cloneFlow(),
      catalog: [
        { id: "model:deepseek-r1", name: "DeepSeek R1" },
        {
          id: "offline",
          models: [{ id: "model:nested", name: "Nested Model" }]
        }
      ]
    }));
  });

  it("prefers explicit model labels in params", () => {
    useFlowStore.getState().updateNodeParams("llm-node", () => ({
      modelLabel: "Reasoner"
    }));

    expect(getNodeName("llm-node")).toBe("Reasoner");
  });

  it("reads nested model objects for display names", () => {
    useFlowStore.getState().updateNodeParams("llm-node", () => ({
      model: { name: "Nested Friendly", id: "model:nested" }
    }));

    expect(getNodeName("llm-node")).toBe("Nested Friendly");
  });

  it("falls back to catalog lookup when only modelId is provided", () => {
    useFlowStore.getState().updateNodeParams("llm-node", () => ({
      modelId: "model:deepseek-r1"
    }));

    expect(getNodeName("llm-node")).toBe("DeepSeek R1");
  });

  it("strips the model prefix when no catalog match exists", () => {
    useFlowStore.setState((state) => ({ ...state, catalog: [] }));

    useFlowStore.getState().updateNodeParams("llm-node", () => ({
      modelId: "model:custom-variant"
    }));

    expect(getNodeName("llm-node")).toBe("custom-variant");
  });

  it("leaves non-LLM node names unchanged", () => {
    useFlowStore.getState().updateNodeParams("module-node", () => ({
      modelLabel: "Should Not Apply"
    }));

    expect(getNodeName("module-node")).toBe("Prompt");
  });
});

