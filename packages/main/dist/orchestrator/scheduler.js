export class Frontier {
    ready = new Set();
    constructor(initial) {
        initial.forEach((n) => this.ready.add(n));
    }
    hasReady() {
        return this.ready.size > 0;
    }
    nextReady() {
        const id = this.ready.values().next().value;
        this.ready.delete(id);
        return id;
    }
    add(n) {
        this.ready.add(n);
    }
}
export function topoOrder(flow) {
    const indeg = new Map();
    flow.nodes.forEach((n) => indeg.set(n.id, 0));
    flow.edges.forEach((e) => indeg.set(e.to[0], (indeg.get(e.to[0]) ?? 0) + 1));
    const q = Array.from(indeg.entries())
        .filter(([_, d]) => d === 0)
        .map(([id]) => id);
    const out = [];
    while (q.length) {
        const u = q.shift();
        out.push(u);
        flow.edges
            .filter((e) => e.from[0] === u)
            .forEach((e) => {
            const v = e.to[0];
            indeg.set(v, (indeg.get(v) ?? 1) - 1);
            if ((indeg.get(v) ?? 0) === 0)
                q.push(v);
        });
    }
    return out;
}
export function downstream(flow, nodeId) {
    return flow.edges
        .filter((e) => e.from[0] === nodeId)
        .map((e) => e.to[0]);
}
