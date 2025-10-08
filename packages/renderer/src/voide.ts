import { FlowDef, PayloadT } from "@voide/shared";
import type { TelemetryPayload } from "@voide/ipc";

export interface VoideApi {
  getNodeCatalog: () => Promise<Array<{ type: string; in: PortSpec[]; out: PortSpec[] }>>;
  runFlow: (flow: FlowDef, inputs?: Record<string, unknown>) => Promise<{ runId: string }>;
  stopFlow: (runId: string) => Promise<{ ok: boolean }>;
  openFlow: () => Promise<{ flow: FlowDef } | null>;
  saveFlow: (flow: FlowDef) => Promise<void>;
  validateFlow: (flow: FlowDef) => Promise<{ ok: boolean; errors?: unknown }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  getLastRunPayloads: (runId: string) => Promise<Array<{ nodeId: string; port: string; payload: PayloadT }>>;
  onTelemetry?: (cb: (event: TelemetryPayload) => void) => (() => void) | void;
}

type PortSpec = { port: string; types: string[] };

const mockCatalog: Array<{ type: string; in: PortSpec[]; out: PortSpec[] }> = [
  { type: "ui", in: [{ port: "in", types: ["text", "json"] }], out: [{ port: "out", types: ["text", "json"] }] },
  { type: "llm", in: [{ port: "prompt", types: ["text"] }], out: [{ port: "completion", types: ["text"] }] },
  { type: "prompt", in: [{ port: "in", types: ["text", "json"] }], out: [{ port: "out", types: ["text", "json"] }] },
  { type: "memory", in: [{ port: "in", types: ["text", "json"] }], out: [{ port: "out", types: ["text", "json"] }] },
  { type: "debate", in: [{ port: "in", types: ["text", "json"] }], out: [{ port: "out", types: ["text", "json"] }] },
  { type: "log", in: [{ port: "in", types: ["text", "json"] }], out: [{ port: "out", types: ["text", "json"] }] },
  { type: "cache", in: [{ port: "in", types: ["text", "json"] }], out: [{ port: "out", types: ["text", "json"] }] },
  { type: "divider", in: [{ port: "in", types: ["text", "json"] }], out: [{ port: "out", types: ["text", "json"] }] },
  { type: "loop", in: [{ port: "in", types: ["text"] }], out: [{ port: "body", types: ["text"] }, { port: "out", types: ["text"] }] }
];

const sampleFlow: FlowDef = {
  id: "flow:example",
  version: "1.0.0",
  nodes: [
    {
      id: "prompt",
      name: "Prompt",
      type: "system.prompt",
      params: { text: "Welcome to VOIDE" },
      in: [],
      out: [{ port: "out", types: ["text"] }]
    },
    {
      id: "llm",
      name: "LLAMA3.1 8B",
      type: "llm.generic",
      params: {
        modelId: "model:llama3.1-8b.Q4_K_M",
        adapter: "llama.cpp",
        runtime: "CPU",
        temperature: 0.2,
        maxTokens: 2048,
        promptTemplate: ""
      },
      in: [{ port: "prompt", types: ["text"] }],
      out: [{ port: "completion", types: ["text"] }]
    },
    {
      id: "output",
      name: "Output",
      type: "output",
      params: {},
      in: [{ port: "in", types: ["text"] }],
      out: []
    }
  ],
  edges: [
    { id: "e1", from: ["prompt", "out"], to: ["llm", "prompt"] },
    { id: "e2", from: ["llm", "completion"], to: ["output", "in"] }
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

