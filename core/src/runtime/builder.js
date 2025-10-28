import { getNodeType } from "./registry.js";
function collectPorts(defined, declared) {
    const ports = [];
    const seen = new Set();
    for (const entry of defined ?? []) {
        if (typeof entry?.port === "string" && !seen.has(entry.port)) {
            ports.push(entry.port);
            seen.add(entry.port);
        }
    }
    for (const key of Object.keys(declared ?? {})) {
        if (!seen.has(key)) {
            ports.push(key);
            seen.add(key);
        }
    }
    return ports;
}
function cloneEdge(edge) {
    return {
        id: edge.id,
        from: [edge.from[0], edge.from[1]],
        to: [edge.to[0], edge.to[1]],
        label: edge.label,
    };
}
export function buildFlow(flowDef) {
    const nodes = new Map();
    for (const node of flowDef.nodes ?? []) {
        const typeDef = getNodeType(node.type);
        const params = { ...(node.params ?? {}) };
        const inputs = collectPorts(node.in, typeDef.inPorts);
        const outputs = collectPorts(node.out, typeDef.outPorts);
        nodes.set(node.id, {
            id: node.id,
            type: node.type,
            execute: typeDef.execute,
            params,
            inputs,
            outputs,
        });
    }
    const edges = (flowDef.edges ?? []).map(cloneEdge);
    return { nodes, edges };
}
