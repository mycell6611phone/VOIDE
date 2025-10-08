import { FlowDef, PayloadT } from "@voide/shared";
import type { TelemetryPayload } from "@voide/ipc";

type PortSpec = { port: string; types: string[] };

export interface NodeCatalogEntry {
  type: string;
  label: string;
  inputs: PortSpec[];
  outputs: PortSpec[];
  params: Record<string, unknown>;
}

export interface VoideApi {
  getNodeCatalog: () => Promise<NodeCatalogEntry[]>;
  runFlow: (flow: FlowDef, inputs?: Record<string, unknown>) => Promise<{ runId: string }>;
  stopFlow: (runId: string) => Promise<{ ok: boolean }>;
  openFlow: () => Promise<{ flow: FlowDef } | null>;
  saveFlow: (flow: FlowDef) => Promise<void>;
  validateFlow: (flow: FlowDef) => Promise<{ ok: boolean; errors?: unknown }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  getLastRunPayloads: (runId: string) => Promise<Array<{ nodeId: string; port: string; payload: PayloadT }>>;
  onTelemetry?: (cb: (event: TelemetryPayload) => void) => (() => void) | void;
}

const mockCatalog: NodeCatalogEntry[] = [
  {
    type: "chat.input",
    label: "ChatInput",
    inputs: [{ port: "response", types: ["text", "json"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { message: "" },
  },
  {
    type: "prompt",
    label: "Prompt",
    inputs: [{ port: "vars", types: ["json", "text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { template: "" },
  },
  {
    type: "llm",
    label: "LLM",
    inputs: [{ port: "prompt", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: {
      adapter: "llama.cpp",
      runtime: "CPU",
      temperature: 0.7,
      maxTokens: 2048,
    },
  },
  {
    type: "debate.loop",
    label: "Debate/Loop",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { iterations: 2, reducer: "last" },
  },
  {
    type: "cache",
    label: "Cache",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { strategy: "read-through", key: "" },
  },
  {
    type: "log",
    label: "Log",
    inputs: [{ port: "any", types: ["text", "json", "vector"] }],
    outputs: [{ port: "any", types: ["text", "json", "vector"] }],
    params: { tag: "" },
  },
  {
    type: "memory",
    label: "Memory",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { op: "get", namespace: "default", key: "" },
  },
  {
    type: "diverter",
    label: "Diverter",
    inputs: [{ port: "in", types: ["text", "json"] }],
    outputs: [
      { port: "a", types: ["text", "json"] },
      { port: "b", types: ["text", "json"] },
    ],
    params: { route: "all" },
  },
  {
    type: "tool.call",
    label: "Tool Call",
    inputs: [{ port: "args", types: ["json", "text"] }],
    outputs: [{ port: "result", types: ["json", "text"] }],
    params: { tool: "" },
  },
];

const sampleFlow: FlowDef = {
  id: "flow:example",
  version: "1.0.0",
  nodes: [
    {
      id: "chat-input",
      name: "ChatInput",
      type: "chat.input",
      params: { message: "Tell me something interesting about space." },
      in: [{ port: "response", types: ["text", "json"] }],
      out: [{ port: "text", types: ["text"] }],
    },
    {
      id: "prompt",
      name: "Prompt",
      type: "prompt",
      params: { template: "You are a helpful assistant.\nUser: {{input}}\nAssistant:" },
      in: [{ port: "vars", types: ["json", "text"] }],
      out: [{ port: "text", types: ["text"] }],
    },
    {
      id: "llm",
      name: "LLAMA3.1 8B",
      type: "llm",
      params: {
        modelId: "model:llama3.1-8b.Q4_K_M",
        adapter: "llama.cpp",
        runtime: "CPU",
        temperature: 0.2,
        maxTokens: 2048,
      },
      in: [{ port: "prompt", types: ["text"] }],
      out: [{ port: "text", types: ["text"] }],
    },
    {
      id: "logger",
      name: "Log",
      type: "log",
      params: { tag: "sample" },
      in: [{ port: "any", types: ["text", "json", "vector"] }],
      out: [{ port: "any", types: ["text", "json", "vector"] }],
    },
    {
      id: "output",
      name: "Output",
      type: "output",
      params: {},
      in: [{ port: "text", types: ["text"] }],
      out: [],
    },
  ],
  edges: [
    { id: "e1", from: ["chat-input", "text"], to: ["prompt", "vars"] },
    { id: "e2", from: ["prompt", "text"], to: ["llm", "prompt"] },
    { id: "e3", from: ["llm", "text"], to: ["logger", "any"] },
    { id: "e4", from: ["logger", "any"], to: ["output", "text"] },
  ]
};

function createFallbackVoide(): VoideApi {
  let storedFlow: FlowDef = sampleFlow;
  const telemetryListeners = new Set<(event: TelemetryPayload) => void>();

  return {
    async getNodeCatalog() {
      console.info("[voide-mock] Using mock node catalog (renderer running outside Electron)");
      return mockCatalog;
    },
    async runFlow(flow, _inputs = {}) {
      console.warn("[voide-mock] Flow execution is disabled outside the Electron runtime.");
      throw new Error(
        "Mock runs have been removed. Start the Electron app with a configured llama.cpp or gpt4all backend to execute flows."
      );
    },
    async stopFlow(runId) {
      console.warn(`[voide-mock] stopFlow(${runId}) called but no mock run is active.`);
      return { ok: true };
    },
    async openFlow() {
      console.info("[voide-mock] Returning in-memory flow");
      return { flow: storedFlow };
    },
    async saveFlow(flow) {
      storedFlow = flow;
      console.info(`[voide-mock] Saved flow '${flow.id}' in memory`);
    },
    async validateFlow(flow) {
      const errors: string[] = [];
      if (!flow.id?.trim()) errors.push("Flow id is required");
      if (!flow.version?.trim()) errors.push("Flow version is required");
      const nodeIds = new Set<string>();
      flow.nodes.forEach((node) => {
        if (nodeIds.has(node.id)) {
          errors.push(`Duplicate node id: ${node.id}`);
        } else {
          nodeIds.add(node.id);
        }
      });
      return { ok: errors.length === 0, errors };
    },
    async getLastRunPayloads(runId) {
      console.warn(`[voide-mock] getLastRunPayloads(${runId}) requested but mock runs are disabled.`);
      return [];
    },
    onTelemetry(cb) {
      telemetryListeners.add(cb);
      return () => {
        telemetryListeners.delete(cb);
      };
    }
  };
}

declare global {
  interface Window {
    voide?: VoideApi;
  }
}

const globalWindow = typeof window !== "undefined" ? (window as Window & { voide?: VoideApi }) : undefined;
const fallback = createFallbackVoide();

const voideInstance: VoideApi = globalWindow?.voide ? { ...fallback, ...globalWindow.voide } : fallback;

if (globalWindow) {
  globalWindow.voide = voideInstance;
}

export const voide = voideInstance;

