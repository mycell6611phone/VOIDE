import { create } from "zustand";
import type { FlowDef, NodeDef } from "@voide/shared";

const empty: FlowDef = { id: "flow:new", version: "1.0.0", nodes: [], edges: [] };

interface S {
  flow: FlowDef;
  setFlow: (f: FlowDef) => void;
  addNode: (node: NodeDef) => void;
  catalog: any[];
  setCatalog: (c: any[]) => void;
  activeTool: "select" | "wire";
  setActiveTool: (tool: "select" | "wire") => void;
}
export const useFlowStore = create<S>((set) => ({
  flow: empty,
  setFlow: (f: FlowDef) => set({ flow: f }),
  addNode: (node: NodeDef) =>
    set((state) => ({
      flow: {
        ...state.flow,
        nodes: [...state.flow.nodes, node]
      }
    })),
  catalog: [],
  setCatalog: (c: any[]) => set({ catalog: c }),
  activeTool: "select",
  setActiveTool: (tool: "select" | "wire") => set({ activeTool: tool })
}));
