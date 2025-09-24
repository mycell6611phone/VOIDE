import { create } from "zustand";
import type { EdgeDef, FlowDef, NodeDef } from "@voide/shared";
import { createInitialFlow } from "../constants/mockLayout";

const POSITION_KEY = "__position";

const DEFAULT_NODE_POSITION = { x: 360, y: 240 } as const;

const uniqueId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const uniqueNodeId = (type: string) => uniqueId(type || "node");

const uniqueEdgeId = (edge: EdgeDef) =>
  uniqueId(`edge-${edge.from[0]}-${edge.to[0]}-${edge.from[1]}-${edge.to[1]}`);

const cloneValue = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const readNodePosition = (node: NodeDef) => {
  const params = node.params as Record<string, unknown> | undefined;
  const value = params?.[POSITION_KEY];
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { x?: unknown }).x === "number" &&
    typeof (value as { y?: unknown }).y === "number"
  ) {
    const position = value as { x: number; y: number };
    return { x: position.x, y: position.y };
  }
  return { ...DEFAULT_NODE_POSITION };
};

const withNodePosition = (node: NodeDef, position: { x: number; y: number }) => {
  const params = { ...(node.params ?? {}) } as Record<string, unknown>;
  params[POSITION_KEY] = { x: position.x, y: position.y };
  return params;
};

type ClipboardItem =
  | { kind: "node"; node: NodeDef; position: { x: number; y: number } }
  | { kind: "edge"; edge: EdgeDef };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const pickFirstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }
  return null;
};

const findModelNameInCatalog = (
  catalog: unknown,
  modelId: string
): string | null => {
  if (!Array.isArray(catalog)) {
    return null;
  }

  const stack: unknown[] = [...catalog];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const entryId = record.id;
    if (isNonEmptyString(entryId) && entryId === modelId) {
      const label = pickFirstString(record.name, record.label, record.title);
      if (label) {
        return label;
      }
    }

    const nested = [record.models, record.items, record.children];
    for (const group of nested) {
      if (Array.isArray(group)) {
        stack.push(...group);
      }
    }
  }

  return null;
};

const deriveLLMDisplayName = (
  params: Record<string, unknown>,
  catalog: unknown
): string | null => {
  const direct = pickFirstString(
    params.modelLabel,
    params.modelName,
    params.displayName,
    params.title,
    params.label
  );
  if (direct) {
    return direct;
  }

  const modelField = params.model;
  if (modelField && typeof modelField === "object") {
    const record = modelField as Record<string, unknown>;
    const nestedDirect = pickFirstString(
      record.name,
      record.label,
      record.title
    );
    if (nestedDirect) {
      return nestedDirect;
    }
    const nestedId = record.id;
    if (isNonEmptyString(nestedId)) {
      const fromCatalog = findModelNameInCatalog(catalog, nestedId.trim());
      if (fromCatalog) {
        return fromCatalog;
      }
      const fallback = nestedId.replace(/^model:/i, "").trim();
      if (fallback) {
        return fallback;
      }
    }
  }

  const modelIdRaw = params.modelId;
  if (isNonEmptyString(modelIdRaw)) {
    const modelId = modelIdRaw.trim();
    const fromCatalog = findModelNameInCatalog(catalog, modelId);
    if (fromCatalog) {
      return fromCatalog;
    }
    const fallback = modelId.replace(/^model:/i, "").trim();
    if (fallback) {
      return fallback;
    }
  }

  return null;
};

interface S {
  flow: FlowDef;
  setFlow: (f: FlowDef) => void;
  addNode: (node: NodeDef) => void;
  updateNodeParams: (
    nodeId: string,
    updater: (prev: Record<string, unknown>) => Record<string, unknown>
  ) => void;
  catalog: any[];
  setCatalog: (c: any[]) => void;
  activeTool: "select" | "wire";
  setActiveTool: (tool: "select" | "wire") => void;
  clipboard: ClipboardItem | null;
  setClipboard: (item: ClipboardItem | null) => void;
  copyNode: (nodeId: string) => void;
  cutNode: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  copyEdge: (edgeId: string) => void;
  cutEdge: (edgeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  pasteClipboard: (
    preferredKind?: ClipboardItem["kind"]
  ) => NodeDef | EdgeDef | null;
}
export const useFlowStore = create<S>((set, get) => ({
  flow: createInitialFlow(),
  setFlow: (f: FlowDef) => set({ flow: f }),
  addNode: (node: NodeDef) =>
    set((state) => ({
      flow: {
        ...state.flow,
        nodes: [...state.flow.nodes, node]
      }
    })),
  updateNodeParams: (nodeId, updater) =>
    set((state) => ({
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          const previous = { ...(node.params ?? {}) };
          const nextRaw = updater(previous);
          const nextParams =
            nextRaw && typeof nextRaw === "object"
              ? (nextRaw as Record<string, unknown>)
              : previous;

          if ((node.type ?? "module") === "llm") {
            const displayName = deriveLLMDisplayName(
              nextParams,
              state.catalog
            );
            if (displayName && displayName !== node.name) {
              return {
                ...node,
                name: displayName,
                params: nextParams
              };
            }
          }

          return {
            ...node,
            params: nextParams
          };
        })
      }
    })),
  catalog: [],
  setCatalog: (c: any[]) => set({ catalog: c }),
  activeTool: "select",
  setActiveTool: (tool: "select" | "wire") => set({ activeTool: tool }),
  clipboard: null,
  setClipboard: (item: ClipboardItem | null) => set({ clipboard: item }),
  copyNode: (nodeId: string) => {
    const node = get().flow.nodes.find((entry) => entry.id === nodeId);
    if (!node) {
      return;
    }
    const snapshot = cloneValue(node);
    const position = readNodePosition(node);
    set({ clipboard: { kind: "node", node: snapshot, position } });
  },
  cutNode: (nodeId: string) => {
    const { copyNode, deleteNode } = get();
    copyNode(nodeId);
    deleteNode(nodeId);
  },
  deleteNode: (nodeId: string) =>
    set((state) => {
      if (!state.flow.nodes.some((node) => node.id === nodeId)) {
        return {};
      }
      const nodes = state.flow.nodes.filter((node) => node.id !== nodeId);
      const edges = state.flow.edges.filter(
        (edge) => edge.from[0] !== nodeId && edge.to[0] !== nodeId
      );
      return {
        flow: {
          ...state.flow,
          nodes,
          edges
        }
      };
    }),
  copyEdge: (edgeId: string) => {
    const edge = get().flow.edges.find((entry) => entry.id === edgeId);
    if (!edge) {
      return;
    }
    set({ clipboard: { kind: "edge", edge: cloneValue(edge) } });
  },
  cutEdge: (edgeId: string) => {
    const { copyEdge, deleteEdge } = get();
    copyEdge(edgeId);
    deleteEdge(edgeId);
  },
  deleteEdge: (edgeId: string) =>
    set((state) => {
      if (!state.flow.edges.some((edge) => edge.id === edgeId)) {
        return {};
      }
      return {
        flow: {
          ...state.flow,
          edges: state.flow.edges.filter((edge) => edge.id !== edgeId)
        }
      };
    }),
  pasteClipboard: (preferredKind) => {
    const clipboard = get().clipboard;
    if (!clipboard) {
      return null;
    }
    if (preferredKind && clipboard.kind !== preferredKind) {
      return null;
    }
    if (clipboard.kind === "node") {
      const reference = clipboard.node;
      const nextPosition = {
        x: clipboard.position.x + 48,
        y: clipboard.position.y + 48
      };
      const clone = cloneValue(reference);
      const nextId = uniqueNodeId(clone.type ?? "node");
      const params = withNodePosition(clone, nextPosition);
      const nextNode: NodeDef = {
        ...clone,
        id: nextId,
        params
      };
      set((state) => ({
        flow: {
          ...state.flow,
          nodes: [...state.flow.nodes, nextNode]
        }
      }));
      return nextNode;
    }
    if (clipboard.kind === "edge") {
      const flow = get().flow;
      const { edge } = clipboard;
      const sourceExists = flow.nodes.some((node) => node.id === edge.from[0]);
      const targetExists = flow.nodes.some((node) => node.id === edge.to[0]);
      if (!sourceExists || !targetExists) {
        return null;
      }
      const nextEdge: EdgeDef = {
        ...cloneValue(edge),
        id: uniqueEdgeId(edge)
      };
      set((state) => ({
        flow: {
          ...state.flow,
          edges: [...state.flow.edges, nextEdge]
        }
      }));
      return nextEdge;
    }
    return null;
  }
}));
