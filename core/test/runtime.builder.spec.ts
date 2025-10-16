import { describe, it, expect } from "vitest";
import type { FlowDef } from "@voide/shared";
import { buildFlow } from "../src/runtime/builder";

describe("buildFlow", () => {
  const sampleFlow: FlowDef = {
    id: "demo",
    version: "1.0.0",
    nodes: [
      {
        id: "user",
        type: "InputNode",
        name: "User",
        params: {},
        in: [],
        out: [{ port: "text", types: ["UserText"] }],
      },
      {
        id: "prompt",
        type: "PromptNode",
        name: "Prompt",
        params: { template: "Hello" },
        in: [{ port: "text", types: ["UserText"] }],
        out: [{ port: "prompt", types: ["PromptText"] }],
      },
      {
        id: "llm",
        type: "LLMNode",
        name: "LLM",
        params: { model: "stub" },
        in: [{ port: "prompt", types: ["PromptText"] }],
        out: [{ port: "text", types: ["LLMText"] }],
      },
      {
        id: "out",
        type: "OutputNode",
        name: "Output",
        params: { name: "out" },
        in: [{ port: "text", types: ["LLMText"] }],
        out: [],
      },
    ],
    edges: [
      { id: "e1", from: ["user", "text"], to: ["prompt", "text"] },
      { id: "e2", from: ["prompt", "prompt"], to: ["llm", "prompt"] },
      { id: "e3", from: ["llm", "text"], to: ["out", "text"] },
    ],
  };

  it("produces runtime nodes with metadata and params", () => {
    const runtime = buildFlow(sampleFlow);

    expect(runtime.edges).toEqual(sampleFlow.edges);
    expect(runtime.nodes.size).toBe(sampleFlow.nodes.length);

    const user = runtime.nodes.get("user");
    expect(user).toBeDefined();
    expect(user?.type).toBe("InputNode");
    expect(user?.inputs).toEqual([]);
    expect(user?.outputs).toEqual(["text"]);
    expect(typeof user?.execute).toBe("function");

    const llm = runtime.nodes.get("llm");
    expect(llm?.params).toEqual({ model: "stub" });
    expect(llm?.outputs).toEqual(["text"]);
    expect(llm?.inputs).toEqual(["prompt"]);
    expect(llm?.params).not.toBe(sampleFlow.nodes[2].params);
  });

  it("throws when encountering unknown node types", () => {
    const badFlow: FlowDef = {
      id: "bad",
      version: "1.0.0",
      nodes: [
        {
          id: "mystery",
          type: "MysteryNode",
          name: "Mystery",
          params: {},
          in: [],
          out: [],
        },
      ],
      edges: [],
    };

    expect(() => buildFlow(badFlow)).toThrowError(
      new Error("Unknown node type: MysteryNode"),
    );
  });

  it("uses node type metadata when port lists are absent", () => {
    const missingPorts: FlowDef = {
      id: "missing",
      version: "1.0.0",
      nodes: [
        {
          id: "prompt",
          type: "PromptNode",
          name: "Prompt",
          params: {},
          in: [],
          out: [],
        },
      ],
      edges: [],
    };

    const runtime = buildFlow(missingPorts);
    const prompt = runtime.nodes.get("prompt");
    expect(prompt?.inputs).toEqual(["text"]);
    expect(prompt?.outputs).toEqual(["prompt"]);
  });
});
 
