import create from "zustand";
import { nanoid } from "nanoid";

export type NodeType =
  | "Input"
  | "Prompt"
  | "LLM"
  | "Branch"
  | "Log"
  | "Output";

export interface PortSpec {
  port: string;
  types: string[];
}

export interface NodeSpec {
  type: NodeType;
  in: PortSpec[];
  out: PortSpec[];
  config: FormField[];
}

export interface FormField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean";
}

export const NODE_SPECS: Record<NodeType, NodeSpec> = {
  Input: {
    type: "Input",
    in: [],
    out: [{ port: "text", types: ["UserText"] }],
    config: [{ key: "id", label: "Id", type: "string" }],
  },
  Prompt: {
    type: "Prompt",
    in: [{ port: "text", types: ["UserText"] }],
    out: [{ port: "prompt", types: ["PromptText"] }],
    config: [{ key: "id", label: "Id", type: "string" }],
  },
  LLM: {
    type: "LLM",
    in: [{ port: "prompt", types: ["PromptText"] }],
    out: [{ port: "completion", types: ["LLMText"] }],
    config: [{ key: "model", label: "Model", type: "string" }],
  },
  Branch: {
    type: "Branch",
    in: [{ port: "input", types: ["LLMText"] }],
    out: [
      { port: "true", types: ["LLMText"] },
      { port: "false", types: ["LLMText"] },
    ],
    config: [{ key: "condition", label: "Condition", type: "string" }],
  },
  Log: {
    type: "Log",
    in: [{ port: "input", types: ["AnyBlob"] }],
    out: [{ port: "out", types: ["AnyBlob"] }],
    config: [{ key: "name", label: "Name", type: "string" }],
  },
  Output: {
    type: "Output",
    in: [{ port: "input", types: ["LLMText"] }],
    out: [],
    config: [{ key: "name", label: "Name", type: "string" }],
  },
};

export type LightState =
  | "idle"
  | "queued"
  | "running"
  | "ok"
  | "warn"
  | "error"
  | "normalized"
  | "routed";

export interface NodeState {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  config: Record<string, any>;
  status?: LightState;
}

export interface Pulse {
  id: string;
  progress: number;
  shape: string;
}

export interface EdgeState {
  id: string;
  from: { node: string; port: string };
  to: { node: string; port: string };
  type: string;
  status?: LightState;
  pulses: Pulse[];
}

export type TelemetryEvent =
  | {
      type: "node_state";
      runId: string;
      nodeId: string;
      state: LightState;
      at: number;
    }
  | {
      type: "edge_transfer";
      runId: string;
      edgeId: string;
      bytes: number;
      at: number;
    }
  | {
      type: "normalize";
      runId: string;
      nodeId: string;
      fromType: string;
      toType: string;
      at: number;
    }
  | {
      type: "error";
      runId: string;
      nodeId: string;
      code: string;
      message: string;
      at: number;
    };

interface FlowState {
  nodes: NodeState[];
  edges: EdgeState[];
  selected?: string;
  output: string;
  flowBin?: Uint8Array;
  events: TelemetryEvent[];
  runId?: string;
  addNode: (type: NodeType, x: number, y: number) => void;
  updateNode: (id: string, cfg: Partial<NodeState>) => void;
  select: (id?: string) => void;
  addEdge: (from: EdgeState["from"], to: EdgeState["to"], type: string) => void;
  setStatus: (id: string, status: LightState) => void;
  setEdgeStatus: (id: string, status: LightState) => void;
  pulseEdge: (id: string) => void;
  advancePulses: () => void;
  handleTelemetry: (ev: TelemetryEvent, record?: boolean) => void;
  simulate: () => void;
  setOutput: (text: string) => void;
  setFlowBin: (bin: Uint8Array) => void;
  resetStatuses: () => void;
}

export const useFlow = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  output: "",
  events: [],
  addNode: (type, x, y) => {
    const spec = NODE_SPECS[type];
    set((s) => ({
      nodes: [
        ...s.nodes,
        {
          id: nanoid(6),
          type,
          x,
          y,
          config: Object.fromEntries(spec.config.map((f) => [f.key, ""])),
          status: "idle",
        },
      ],
    }));
  },
  updateNode: (id, cfg) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...cfg } : n)),
    })),
  select: (id) => set({ selected: id }),
  addEdge: (from, to, type) =>
    set((s) => ({
      edges: [
        ...s.edges,
        { id: nanoid(6), from, to, type, status: "idle", pulses: [] },
      ],
    })),
  setStatus: (id, status) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, status } : n)),
    })),
  setEdgeStatus: (id, status) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, status } : e)),
    })),
  pulseEdge: (id) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id
          ? {
              ...e,
              pulses: [...e.pulses, { id: nanoid(6), progress: 0, shape: e.type }],
            }
          : e
      ),
    })),
  advancePulses: () =>
    set((s) => ({
      edges: s.edges.map((e) => ({
        ...e,
        pulses: e.pulses
          .map((p) => ({ ...p, progress: p.progress + 0.02 }))
          .filter((p) => p.progress < 1),
      })),
    })),
  handleTelemetry: (ev, record = true) => {
    if (record) {
      set((s) =>
        s.runId === ev.runId
          ? { events: [...s.events, ev] }
          : { runId: ev.runId, events: [ev] }
      );
    }
    switch (ev.type) {
      case "node_state":
        get().setStatus(ev.nodeId, ev.state);
        break;
      case "edge_transfer": {
        const edge = get().edges.find((e) => e.id === ev.edgeId);
        if (edge) {
          get().setEdgeStatus(edge.id, "routed");
          get().pulseEdge(edge.id);
          setTimeout(() => get().setEdgeStatus(edge.id, "idle"), 300);
        }
        break;
      }
      case "normalize":
        get().setStatus(ev.nodeId, "normalized");
        break;
      case "error":
        get().setStatus(ev.nodeId, "error");
        break;
    }
  },
  simulate: () => {
    const { events, resetStatuses, nodes, setStatus } = get();
    resetStatuses();
    nodes.forEach((n) => setStatus(n.id, "queued"));
    let delay = 0;
    for (const ev of events) {
      setTimeout(() => get().handleTelemetry(ev, false), delay);
      delay += 200;
    }
  },
  setOutput: (text) => set({ output: text }),
  setFlowBin: (bin) => set({ flowBin: bin }),
  resetStatuses: () =>
    set((s) => ({
      nodes: s.nodes.map((n) => ({ ...n, status: "idle" })),
      edges: s.edges.map((e) => ({ ...e, status: "idle", pulses: [] })),
    })),
}));

export function portPosition(
  node: NodeState,
  dir: "in" | "out",
  port: string
): { x: number; y: number } {
  const spec = NODE_SPECS[node.type][dir];
  const idx = spec.findIndex((p) => p.port === port);
  const offsetY = 20 + idx * 20;
  const x = dir === "in" ? node.x : node.x + 120;
  const y = node.y + offsetY;
  return { x, y };
}

