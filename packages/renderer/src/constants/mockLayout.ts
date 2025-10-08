import {
  DEFAULT_PROMPT_PRESET_ID,
  PROMPT_PRESET_MAP,
  type FlowDef,
} from "@voide/shared";

export const mockLayoutFlow: FlowDef = {
  id: "flow:draft-layout",
  version: "1.0.0",
  nodes: [
    {
      id: "chat-input",
      type: "chat.input",
      name: "ChatInput",
      params: {
        __position: { x: 120, y: 360 },
        role: "entrypoint",
        moduleKey: "chat.input",
        message: "How can I help you today?",
      },
      in: [{ port: "response", types: ["TEXT", "JSON"] }],
      out: [{ port: "text", types: ["TEXT"] }],
    },
    {
      id: "prompt-main",
      type: "prompt",
      name: "Prompt",
      params: {
        __position: { x: 420, y: 360 },
        template: PROMPT_PRESET_MAP[DEFAULT_PROMPT_PRESET_ID].defaultText,
        preset: "analysis",
        moduleKey: "prompt",
      },
      in: [{ port: "vars", types: ["TEXT", "JSON"] }],
      out: [{ port: "text", types: ["TEXT"] }],
    },
    {
      id: "llm-primary",
      type: "llm",
      name: "LLAMA3.1 8B",
      params: {
        __position: { x: 720, y: 360 },
        adapter: "llama.cpp",
        modelId: "model:llama3.1-8b.Q4_K_M",
        runtime: "CPU",
        temperature: 0.2,
        maxTokens: 2048,
        moduleKey: "llm",
      },
      in: [{ port: "prompt", types: ["TEXT"] }],
      out: [{ port: "text", types: ["TEXT"] }],
    },
    {
      id: "cache-primary",
      type: "cache",
      name: "Cache",
      params: {
        __position: { x: 1020, y: 360 },
        strategy: "read-through",
        key: "last-response",
        moduleKey: "cache",
      },
      in: [{ port: "text", types: ["TEXT"] }],
      out: [{ port: "text", types: ["TEXT"] }],
    }
  ],
  edges: [
    {
      id: "edge-input-prompt",
      from: ["chat-input", "text"],
      to: ["prompt-main", "vars"],
    },
    {
      id: "edge-prompt-llm",
      from: ["prompt-main", "text"],
      to: ["llm-primary", "prompt"],
    },
    {
      id: "edge-llm-cache",
      from: ["llm-primary", "text"],
      to: ["cache-primary", "text"],
    },
    {
      id: "edge-cache-input",
      from: ["cache-primary", "text"],
      to: ["chat-input", "response"],
    },
  ],
  prompts: { packs: [] },
  models: { registryRef: "../models/models.json" },
  profiles: { default: { concurrency: 2 } }
};

export const createInitialFlow = (): FlowDef =>
  JSON.parse(JSON.stringify(mockLayoutFlow));
