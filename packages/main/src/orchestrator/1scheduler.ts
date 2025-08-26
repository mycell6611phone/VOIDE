import type { EdgeDef, FlowDef, NodeDef } from "@voide/shared";

export class Frontier {
  private ready: Set<string> = new Set();
  constructor(initial: string[]) { initial.forEach(n => this.ready.add(n)); }
  hasReady() { return this.ready.size > 0; }
  nextReady() { const id = this.ready.values().next().value; this.ready.delete(id); return id as string; }
  add(n: string) { this.ready.add(n); }
}

export function topoOrder(flow: FlowDef): string[] {
  const indeg = new Map<string, number>();
  flow.nodes.forEach(n => indeg.set(n.id, 0));
  flow.edges.forEach(e => indeg.set(e.to[0], (indeg.get(e.to[0]) ?? 0) + 1));
  const q: string[] = [...Array.from(indeg.entries()).filter(([,d]) => d===0).map(([id]) => id)];
  const out: string[] = [];
  while (q.length) {
    const u = q.shift()!;
    out.push(u);
    flow.edges.filter(e => e.from[0] === u).forEach(e => {
      const v = e.to[0]; indeg.set(v, (indeg.get(v) ?? 1) - 1);
      if ((indeg.get(v) ?? 0) === 0) q.push(v);
    });
  }
  return out;
}

export function downstream(flow: FlowDef, nodeId: string): string[] {
  return flow.edges.filter(e => e.from[0] === nodeId).map(e => e.to[0]);
}
