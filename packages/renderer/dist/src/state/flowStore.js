import { create } from "zustand";
const empty = { id: "flow:new", version: "1.0.0", nodes: [], edges: [] };
export const useFlowStore = create((set) => ({
    flow: empty,
    setFlow: (f) => set({ flow: f }),
    catalog: [],
    setCatalog: (c) => set({ catalog: c })
}));
