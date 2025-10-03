import { FlowDef, PayloadT } from "@voide/shared";

export interface VoideApi {
  getNodeCatalog: () => Promise<Array<{ type: string; in: PortSpec[]; out: PortSpec[] }>>;
  runFlow: (flow: FlowDef) => Promise<{ runId: string }>;
  stopFlow: (runId: string) => Promise<{ ok: boolean }>;
  openFlow: () => Promise<{ flow: FlowDef } | null>;
  saveFlow: (flow: FlowDef) => Promise<void>;
  validateFlow: (flow: FlowDef) => Promise<{ ok: boolean; errors?: unknown }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  getLastRunPayloads: (runId: string) => Promise<Array<{ nodeId: string; port: string; payload: PayloadT }>>;
}

type PortSpec = { port: string; types: string[] };
type RunPayloadRecord = { nodeId: string; port: string; payload: PayloadT };

const mockCatalog: Array<{ type: string; in: PortSpec[]; out: PortSpec[] }> = [
  { type: "orchestrator", in: [{ port: "in", types: ["text", "json", "messages"] }], out: [{ port: "out", types: ["text", "json", "messages"] }] },
  { type: "critic", in: [{ port: "text", types: ["text"] }], out: [{ port: "notes", types: ["text"] }] },
  { type: "llm.generic", in: [{ port: "prompt", types: ["text"] }], out: [{ port: "completion", types: ["text"] }] },
  { type: "system.prompt", in: [], out: [{ port: "out", types: ["text"] }] },
  { type: "embedding", in: [{ port: "text", types: ["text"] }], out: [{ port: "vec", types: ["vector"] }] },
  { type: "retriever", in: [{ port: "vec", types: ["vector"] }], out: [{ port: "docs", types: ["json"] }] },
  { type: "vector.store", in: [{ port: "upsert", types: ["json", "vector"] }], out: [{ port: "ok", types: ["json"] }] },
  { type: "loop", in: [{ port: "in", types: ["text"] }], out: [{ port: "body", types: ["text"] }, { port: "out", types: ["text"] }] },
  { type: "output", in: [{ port: "in", types: ["text", "json"] }], out: [] }
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
      name: "LLM",
      type: "llm.generic",
      params: { modelId: "mock", promptTemplate: "" },
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
  const runs = new Map<string, RunPayloadRecord[]>();
  let storedFlow: FlowDef = sampleFlow;

  return {
    async getNodeCatalog() {
      console.info("[voide-mock] Using mock node catalog (renderer running outside Electron)");
      return mockCatalog;
    },
    async runFlow(flow) {
      const runId = `mock-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const payloads: RunPayloadRecord[] = flow.nodes.flatMap((node) =>
        node.out.map((outPort) => ({
          nodeId: node.id,
          port: outPort.port,
          payload: { kind: "json", value: { message: `Mock payload from ${node.name || node.id}` } }
        }))
      );
      runs.set(runId, payloads);
      console.info(`[voide-mock] Pretending to run flow '${flow.id}' → ${runId}`);
      return { runId };
    },
    async stopFlow(runId) {
      runs.delete(runId);
      console.info(`[voide-mock] Stopping mock run ${runId}`);
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
      return runs.get(runId) ?? [];
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

