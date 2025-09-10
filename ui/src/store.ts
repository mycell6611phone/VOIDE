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

export interface NodeState {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  config: Record<string, any>;
  status?: "idle" | "running" | "success" | "error" | "warning";
}

export interface EdgeState {
  id: string;
  from: { node: string; port: string };
  to: { node: string; port: string };
  type: string;
}

interface FlowState {
  nodes: NodeState[];
  edges: EdgeState[];
  selected?: string;
  output: string;
  flowBin?: Uint8Array;
  addNode: (type: NodeType, x: number, y: number) => void;
  updateNode: (id: string, cfg: Partial<NodeState>) => void;
  select: (id?: string) => void;
  addEdge: (from: EdgeState["from"], to: EdgeState["to"], type: string) => void;
  setStatus: (id: string, status: NodeState["status"]) => void;
  setOutput: (text: string) => void;
  setFlowBin: (bin: Uint8Array) => void;
  resetStatuses: () => void;
}

export const useFlow = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  output: "",
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
    set((s) => ({ edges: [...s.edges, { id: nanoid(6), from, to, type }] })),
  setStatus: (id, status) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, status } : n)),
    })),
  setOutput: (text) => set({ output: text }),
  setFlowBin: (bin) => set({ flowBin: bin }),
  resetStatuses: () =>
    set((s) => ({
      nodes: s.nodes.map((n) => ({ ...n, status: "idle" })),
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

