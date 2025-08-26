import { create } from "zustand";
import type { FlowDef } from "@voide/shared";

const empty: FlowDef = { id: "flow:new", version: "1.0.0", nodes: [], edges: [] };

interface S {
  flow: FlowDef;
  setFlow: (f: FlowDef) => void;
  catalog: any[];
  setCatalog: (c: any[]) => void;
}
export const useFlowStore = create<S>((set) => ({
  flow: empty,
  setFlow: (f: FlowDef) => set({ flow: f }),
  catalog: [],
  setCatalog: (c: any[]) => set({ catalog: c })
}));
