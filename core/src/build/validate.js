export class BuildError extends Error {
    code;
    node;
    port;
    constructor(code, message, node, port) {
        super(message);
        this.code = code;
        this.node = node;
        this.port = port;
    }
}
function findNode(canvas, id) {
    return canvas.nodes.find((n) => n.id === id);
}
function findPort(node, dir, port) {
    const list = dir === "in" ? node.in : node.out;
    return list.find((p) => p.port === port);
}
export function validateMenus(canvas) {
    for (const node of canvas.nodes) {
        if (!Array.isArray(node.in) || !Array.isArray(node.out)) {
            throw new BuildError("E-CONFIG", `menus missing for node ${node.id}`, node.id);
        }
    }
}
export function validateDangling(canvas) {
    for (const e of canvas.edges) {
        const [fromId, fromPort] = e.from;
        const [toId, toPort] = e.to;
        const fromNode = findNode(canvas, fromId);
        if (!fromNode) {
            throw new BuildError("E-DANGLING", `missing node ${fromId}`, fromId);
        }
        const fromSpec = findPort(fromNode, "out", fromPort);
        if (!fromSpec) {
            throw new BuildError("E-DANGLING", `missing port ${fromId}.${fromPort}`, fromId, fromPort);
        }
        const toNode = findNode(canvas, toId);
        if (!toNode) {
            throw new BuildError("E-DANGLING", `missing node ${toId}`, toId);
        }
        const toSpec = findPort(toNode, "in", toPort);
        if (!toSpec) {
            throw new BuildError("E-DANGLING", `missing port ${toId}.${toPort}`, toId, toPort);
        }
    }
}
export function validateTypes(canvas) {
    for (const e of canvas.edges) {
        const fromNode = findNode(canvas, e.from[0]);
        const toNode = findNode(canvas, e.to[0]);
        const fromSpec = findPort(fromNode, "out", e.from[1]);
        const toSpec = findPort(toNode, "in", e.to[1]);
        const common = fromSpec.types.filter((t) => toSpec.types.includes(t));
        if (common.length === 0) {
            throw new BuildError("E-TYPE", `type mismatch ${e.from.join(".")} -> ${e.to.join(".")}`, e.from[0], e.from[1]);
        }
    }
}
export function validateAcyclic(canvas) {
    const adj = new Map();
    for (const e of canvas.edges) {
        const list = adj.get(e.from[0]) ?? [];
        list.push(e.to[0]);
        adj.set(e.from[0], list);
    }
    const visited = new Set();
    const stack = new Set();
    function dfs(id) {
        if (stack.has(id)) {
            throw new BuildError("E-CYCLE", `cycle detected at ${id}`, id);
        }
        if (visited.has(id))
            return;
        stack.add(id);
        for (const next of adj.get(id) ?? []) {
            dfs(next);
        }
        stack.delete(id);
        visited.add(id);
    }
    for (const n of canvas.nodes)
        dfs(n.id);
}
export function validateReachableOutputs(canvas) {
    const used = new Set();
    for (const e of canvas.edges) {
        used.add(`${e.from[0]}.${e.from[1]}`);
    }
    for (const node of canvas.nodes) {
        if (node.type === "output")
            continue;
        for (const port of node.out) {
            const key = `${node.id}.${port.port}`;
            if (!used.has(key)) {
                throw new BuildError("E-UNREACHABLE-OUTPUT", `unreachable output ${key}`, node.id, port.port);
            }
        }
    }
}
export function validateCanvas(canvas) {
    validateMenus(canvas);
    validateDangling(canvas);
    validateTypes(canvas);
    validateAcyclic(canvas);
    validateReachableOutputs(canvas);
}
export function getPort(node, dir, port) {
    return findPort(node, dir, port);
}
