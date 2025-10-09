import type { EdgeDef, FlowDef, NodeDef } from "@voide/shared";

export class Frontier {
  private ready: Set<string> = new Set();

  constructor(initial: string[]) {
    initial.forEach((n: string) => this.ready.add(n));
  }

  hasReady(): boolean {
    return this.ready.size > 0;
  }

  nextReady(): string {
    const id = this.ready.values().next().value as string;
    this.ready.delete(id);
    return id;
  }

  add(n: string): void {
    this.ready.add(n);
  }

  clear(): void {
    this.ready.clear();
  }

  snapshot(): string[] {
    return Array.from(this.ready);
  }
}

export function topoOrder(flow: FlowDef): string[] {
  const indeg = new Map<string, number>();
  flow.nodes.forEach((n: NodeDef) => indeg.set(n.id, 0));
  flow.edges.forEach((e: EdgeDef) =>
    indeg.set(e.to[0], (indeg.get(e.to[0]) ?? 0) + 1)
  );

  const q: string[] = Array.from(indeg.entries())
    .filter(([_, d]) => d === 0)
    .map(([id]) => id);

  const out: string[] = [];
  while (q.length) {
    const u = q.shift()!;
    out.push(u);
    flow.edges
      .filter((e: EdgeDef) => e.from[0] === u)
      .forEach((e: EdgeDef) => {
        const v = e.to[0];
        indeg.set(v, (indeg.get(v) ?? 1) - 1);
        if ((indeg.get(v) ?? 0) === 0) q.push(v);
      });
  }
  return out;
}

export function downstream(flow: FlowDef, nodeId: string): string[] {
  return flow.edges
    .filter((e: EdgeDef) => e.from[0] === nodeId)
    .map((e: EdgeDef) => e.to[0]);
}

