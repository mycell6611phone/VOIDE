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
      id: "cache-primary",
      type: "module",
      name: "Cache",
      params: {
        __position: { x: 1020, y: 360 },
        strategy: "reuse",
        ttl: 900,
        moduleKey: "cache"
      },
      in: [
        { port: "lookup", types: text },
        { port: "store", types: text }
      ],
      out: [{ port: "result", types: text }]
    }
  ],
  edges: [
    {
      id: "edge-ui-prompt",
      from: ["ui-entry", "conversation"],
      to: ["prompt-main", "context"]
    },
    {
      id: "edge-ui-cache",
      from: ["ui-entry", "conversation"],
      to: ["cache-primary", "lookup"]
    },
    {
      id: "edge-prompt-llm",
      from: ["prompt-main", "prompt"],
      to: ["llm-primary", "prompt"]
    },
    {
      id: "edge-llm-cache",
      from: ["llm-primary", "response"],
      to: ["cache-primary", "store"]
    },
    {
      id: "edge-cache-ui",
      from: ["cache-primary", "result"],
      to: ["ui-entry", "feedback"]
    }
  ],
  prompts: { packs: [] },
  models: { registryRef: "../models/models.json" },
  profiles: { default: { concurrency: 2 } }
};

export const createInitialFlow = (): FlowDef =>
  JSON.parse(JSON.stringify(mockLayoutFlow));
