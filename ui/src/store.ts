import { create } from "zustand";
import { nanoid } from "nanoid";

export type NodeType =
  | "Input"
  | "Prompt"
  | "LLM"
  | "Branch"
  | "Log"
  | "Output"
  | "Interface";

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
  Interface: {
    type: "Interface",
    in: [{ port: "input", types: ["AnyBlob"] }],
    out: [{ port: "output", types: ["AnyBlob"] }],
    config: [],
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

export interface InterfaceWindowState {
  inputText: string;
  outputText: string;
  size: { width: number; height: number };
  position: { x: number; y: number };
  isMinimized: boolean;
  zIndex: number;
}

type Bounds = { width: number; height: number };
type Point = { x: number; y: number };

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
  interfaceWindows: Record<string, InterfaceWindowState>;
  maxInterfaceZ: number;
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
  openInterface: (
    id: string,
    options: { bounds: Bounds; preferredPosition?: Point }
  ) => void;
  minimizeInterface: (id: string) => void;
  closeInterface: (id: string) => void;
  setInterfaceInput: (id: string, text: string) => void;
  setInterfaceOutput: (id: string, text: string) => void;
  setInterfaceGeometry: (
    id: string,
    geometry: { position: Point; size: { width: number; height: number } },
    bounds: Bounds
  ) => void;
  focusInterface: (id: string) => void;
  clampInterfaceWindows: (bounds: Bounds) => void;
}

export const useFlow = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  output: "",
  events: [],
  interfaceWindows: {},
  maxInterfaceZ: 1,
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
  openInterface: (id, { bounds, preferredPosition }) =>
    set((s) => {
      const existing = s.interfaceWindows[id];
      const size = existing
        ? clampSize(existing.size, bounds)
        : clampSize(
            { width: INTERFACE_DEFAULT_WIDTH, height: INTERFACE_DEFAULT_HEIGHT },
            bounds
          );
      const position = existing
        ? clampPosition(existing.position, size, bounds)
        : clampPosition(preferredPosition ?? { x: 40, y: 40 }, size, bounds);
      const zIndex = s.maxInterfaceZ + 1;
      return {
        interfaceWindows: {
          ...s.interfaceWindows,
          [id]: {
            inputText: existing?.inputText ?? "",
            outputText: existing?.outputText ?? "",
            size,
            position,
            isMinimized: false,
            zIndex,
          },
        },
        maxInterfaceZ: zIndex,
      };
    }),
  minimizeInterface: (id) =>
    set((s) => {
      const win = s.interfaceWindows[id];
      if (!win) return {};
      return {
        interfaceWindows: {
          ...s.interfaceWindows,
          [id]: { ...win, isMinimized: true },
        },
      };
    }),
  closeInterface: (id) => get().minimizeInterface(id),
  setInterfaceInput: (id, text) =>
    set((s) => {
      const win = s.interfaceWindows[id];
      if (!win) return {};
      return {
        interfaceWindows: {
          ...s.interfaceWindows,
          [id]: { ...win, inputText: text },
        },
      };
    }),
  setInterfaceOutput: (id, text) =>
    set((s) => {
      const win = s.interfaceWindows[id];
      if (!win) return {};
      return {
        interfaceWindows: {
          ...s.interfaceWindows,
          [id]: { ...win, outputText: text },
        },
      };
    }),
  setInterfaceGeometry: (id, geometry, bounds) =>
    set((s) => {
      const win = s.interfaceWindows[id];
      if (!win) return {};
      const size = clampSize(geometry.size, bounds);
      const position = clampPosition(geometry.position, size, bounds);
      return {
        interfaceWindows: {
          ...s.interfaceWindows,
          [id]: { ...win, size, position },
        },
      };
    }),
  focusInterface: (id) =>
    set((s) => {
      const win = s.interfaceWindows[id];
      if (!win) return {};
      const zIndex = s.maxInterfaceZ + 1;
      return {
        interfaceWindows: {
          ...s.interfaceWindows,
          [id]: { ...win, zIndex },
        },
        maxInterfaceZ: zIndex,
      };
    }),
  clampInterfaceWindows: (bounds) =>
    set((s) => {
      let changed = false;
      const next: Record<string, InterfaceWindowState> = {};
      for (const [key, win] of Object.entries(s.interfaceWindows)) {
        const size = clampSize(win.size, bounds);
        const position = clampPosition(win.position, size, bounds);
        if (
          size.width !== win.size.width ||
          size.height !== win.size.height ||
          position.x !== win.position.x ||
          position.y !== win.position.y
        ) {
          changed = true;
        }
        next[key] = { ...win, size, position };
      }
      return changed ? { interfaceWindows: next } : {};
    }),
}));

const INTERFACE_MIN_WIDTH = 480;
const INTERFACE_MIN_HEIGHT = 240;
const INTERFACE_DEFAULT_WIDTH = 816;
const INTERFACE_DEFAULT_HEIGHT = 320;

function clampDimension(value: number, min: number, max: number) {
  const effectiveMin = Math.min(min, max);
  return Math.min(Math.max(value, effectiveMin), max);
}

function clampSize(size: { width: number; height: number }, bounds: Bounds) {
  const width = clampDimension(size.width, INTERFACE_MIN_WIDTH, Math.max(bounds.width, 0));
  const height = clampDimension(size.height, INTERFACE_MIN_HEIGHT, Math.max(bounds.height, 0));
  return { width, height };
}

function clampPosition(position: Point, size: { width: number; height: number }, bounds: Bounds) {
  const maxX = Math.max(0, bounds.width - size.width);
  const maxY = Math.max(0, bounds.height - size.height);
  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, 0), maxY),
  };
}

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

