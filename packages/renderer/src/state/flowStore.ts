import { create } from "zustand";
import type { FlowDef, NodeDef } from "@voide/shared";
import { createInitialFlow } from "../constants/mockLayout";

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
          const next = updater(previous);
          return {
            ...node,
            params: next
          };
        })
      }
    })),
  catalog: [],
  setCatalog: (c: any[]) => set({ catalog: c }),
  activeTool: "select",
  setActiveTool: (tool: "select" | "wire") => set({ activeTool: tool })
}));
