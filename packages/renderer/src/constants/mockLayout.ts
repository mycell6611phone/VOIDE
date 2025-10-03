import {
  DEFAULT_PROMPT_PRESET_ID,
  PROMPT_PRESET_MAP,
  type FlowDef,
} from "@voide/shared";

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
      id: "prompt-main",
      type: "module",
      name: "Prompt",
      params: {
        __position: { x: 420, y: 360 },
        text: PROMPT_PRESET_MAP[DEFAULT_PROMPT_PRESET_ID].defaultText,
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
        __position: { x: 720, y: 360 },
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
      id: "memory-primary",
      type: "module",
      name: "Memory",
      params: {
        __position: { x: 1020, y: 360 },
        mode: "append",
        moduleKey: "memory"
      },
      in: [
        { port: "search", types: text },
        { port: "write", types: text }
      ],
      out: [{ port: "attach", types: text }]
    }
  ],
  edges: [
    {
      id: "edge-ui-prompt",
      from: ["ui-entry", "conversation"],
      to: ["prompt-main", "context"],
      label: "primary"
    },
    {
      id: "edge-prompt-llm",
      from: ["prompt-main", "prompt"],
      to: ["llm-primary", "prompt"],
      label: "draft"
    },
    {
      id: "edge-llm-memory",
      from: ["llm-primary", "response"],
      to: ["memory-primary", "write"],
      label: "completion"
    },
    {
      id: "edge-memory-ui",
      from: ["memory-primary", "attach"],
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
