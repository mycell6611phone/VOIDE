import { create } from "zustand";
import type { FlowDef, NodeDef } from "@voide/shared";
import { createInitialFlow } from "../constants/mockLayout";

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
}
export const useFlowStore = create<S>((set) => ({
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
  setActiveTool: (tool: "select" | "wire") => set({ activeTool: tool })
}));
