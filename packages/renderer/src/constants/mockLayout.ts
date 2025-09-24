import type { FlowDef } from "@voide/shared";

const text = ["TEXT"];

export const mockLayoutFlow: FlowDef = {
  id: "flow:draft-layout",
  version: "1.0.0",
  nodes: [
    {
      id: "ui-entry",
      type: "module",
      name: "UI",
      params: {
        __position: { x: 120, y: 360 },
        role: "entrypoint",
        moduleKey: "interface"
      },
      in: [{ port: "feedback", types: text }],
      out: [{ port: "conversation", types: text }]
    },
    {
      id: "persona-a",
      type: "module",
      name: "Persona A",
      params: {
        __position: { x: 300, y: 360 },
        persona: "Socratic Researcher"
      },
      in: [{ port: "conversation", types: text }],
      out: [{ port: "persona", types: text }]
    },
    {
      id: "prompt-a",
      type: "module",
      name: "Prompt A",
      params: {
        __position: { x: 480, y: 360 },
        preset: "analysis",
        moduleKey: "prompt"
      },
      in: [{ port: "context", types: text }],
      out: [{ port: "prompt", types: text }]
    },
    {
      id: "llm-primary",
      type: "llm",
      name: "LLAMA3.1 8B",
      params: {
        __position: { x: 660, y: 360 },
        adapter: "llama_cpp",
        modelId: "model:llama3.1-8b.Q4_K_M",
        runtime: "CPU",
        temperature: 0.2,
        maxTokens: 2048
      },
      in: [{ port: "prompt", types: text }],
      out: [{ port: "response", types: text }]
    },
    {
      id: "prompt-b",
      type: "module",
      name: "Prompt B",
      params: {
        __position: { x: 840, y: 360 },
        preset: "critique",
        moduleKey: "prompt"
      },
      in: [{ port: "draft", types: text }],
      out: [{ port: "prompt", types: text }]
    },
    {
      id: "llm-secondary",
      type: "llm",
      name: "DeepSeek R1",
      params: {
        __position: { x: 1020, y: 360 },
        adapter: "llama_cpp",
        modelId: "model:deepseek-r1-distill-qwen-14b",
        runtime: "CPU",
        temperature: 0.35,
        maxTokens: 2048
      },
      in: [{ port: "prompt", types: text }],
      out: [{ port: "response", types: text }]
    },
    {
      id: "tool-calculator",
      type: "module",
      name: "Tool: Calculator",
      params: {
        __position: { x: 1200, y: 210 },
        tool: "calculator",
        moduleKey: "tool"
      },
      in: [{ port: "query", types: text }],
      out: [{ port: "result", types: text }]
    },
    {
      id: "debate-k",
      type: "module",
      name: "Debate K",
      params: {
        __position: { x: 1200, y: 360 },
        format: "single-pass",
        moduleKey: "debate"
      },
      in: [
        { port: "argument", types: text },
        { port: "score", types: text }
      ],
      out: [{ port: "panel", types: text }]
    },
    {
      id: "reasoner-v1",
      type: "module",
      name: "ReasonerV1",
      params: {
        __position: { x: 1380, y: 360 },
        strategy: "deterministic"
      },
      in: [{ port: "candidates", types: text }],
      out: [{ port: "decision", types: text }]
    },
    {
      id: "validate",
      type: "module",
      name: "Validate",
      params: {
        __position: { x: 1560, y: 360 },
        schema: "final-check"
      },
      in: [{ port: "input", types: text }],
      out: [{ port: "validated", types: text }]
    },
    {
      id: "loop-1",
      type: "module",
      name: "Loop #1",
      params: {
        __position: { x: 1740, y: 360 },
        maxIters: 3,
        stopOn: "DONE"
      },
      in: [{ port: "input", types: text }],
      out: [{ port: "yield", types: text }]
    },
    {
      id: "memory",
      type: "module",
      name: "Memory",
      params: {
        __position: { x: 1920, y: 360 },
        mode: "append",
        moduleKey: "memory"
      },
      in: [{ port: "write", types: text }],
      out: [{ port: "recall", types: text }]
    },
    {
      id: "gpt-4o",
      type: "llm",
      name: "GPT-4o",
      params: {
        __position: { x: 1020, y: 210 },
        availability: "unavailable-offline"
      },
      in: [{ port: "prompt", types: text }],
      out: [{ port: "response", types: text }]
    },
    {
      id: "gemini",
      type: "llm",
      name: "Gemini",
      params: {
        __position: { x: 1380, y: 210 },
        availability: "unavailable-offline"
      },
      in: [{ port: "prompt", types: text }],
      out: [{ port: "response", types: text }]
    }
  ],
  edges: [
    {
      id: "edge-ui-persona",
      from: ["ui-entry", "conversation"],
      to: ["persona-a", "conversation"],
      label: "primary"
    },
    {
      id: "edge-persona-prompt-a",
      from: ["persona-a", "persona"],
      to: ["prompt-a", "context"],
      label: "persona"
    },
    {
      id: "edge-prompt-a-llm-primary",
      from: ["prompt-a", "prompt"],
      to: ["llm-primary", "prompt"],
      label: "draft"
    },
    {
      id: "edge-llm-primary-prompt-b",
      from: ["llm-primary", "response"],
      to: ["prompt-b", "draft"],
      label: "completion"
    },
    {
      id: "edge-prompt-b-llm-secondary",
      from: ["prompt-b", "prompt"],
      to: ["llm-secondary", "prompt"],
      label: "critique"
    },
    {
      id: "edge-llm-secondary-debate",
      from: ["llm-secondary", "response"],
      to: ["debate-k", "argument"],
      label: "argument"
    },
    {
      id: "edge-llm-secondary-tool",
      from: ["llm-secondary", "response"],
      to: ["tool-calculator", "query"],
      label: "score-input"
    },
    {
      id: "edge-tool-debate",
      from: ["tool-calculator", "result"],
      to: ["debate-k", "score"],
      label: "tool-score"
    },
    {
      id: "edge-debate-reasoner",
      from: ["debate-k", "panel"],
      to: ["reasoner-v1", "candidates"],
      label: "panel"
    },
    {
      id: "edge-reasoner-validate",
      from: ["reasoner-v1", "decision"],
      to: ["validate", "input"],
      label: "decision"
    },
    {
      id: "edge-validate-loop",
      from: ["validate", "validated"],
      to: ["loop-1", "input"],
      label: "validated"
    },
    {
      id: "edge-loop-memory",
      from: ["loop-1", "yield"],
      to: ["memory", "write"],
      label: "iteration"
    },
    {
      id: "edge-memory-ui",
      from: ["memory", "recall"],
      to: ["ui-entry", "feedback"],
      label: "memory"
    }
  ],
  prompts: { packs: [] },
  models: { registryRef: "../models/models.json" },
  profiles: { default: { concurrency: 2 } }
};

export const createInitialFlow = (): FlowDef =>
  JSON.parse(JSON.stringify(mockLayoutFlow));

