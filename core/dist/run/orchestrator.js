import * as pb from "../proto/voide/v1/flow.js";
import { makeContext } from "../sdk/node.js";
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRIES = 0;
function parseEdge(e) {
    const [fromNode, fromPort] = e.from.split(".");
    const [toNode, toPort] = e.to.split(".");
    return { fromNode, fromPort, toNode, toPort, type: e.type, mailbox: [] };
}
function nodeConfig(node) {
    switch (node.type) {
        case "InputNode":
            return { id: node.id };
        case "OutputNode":
            return { name: node.id };
        case "LogNode":
            return { name: node.id };
        case "LLMNode":
            return { model: "stub" };
        default:
            return {};
    }
}
async function withTimeout(p, ms) {
    return Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
}
export async function* orchestrate(flowBin, runtimeInputs, registry, providers = {}) {
    const flow = pb.Flow.decode(flowBin);
    const ctx = makeContext();
    ctx.inputs = runtimeInputs ?? {};
    const nodes = new Map(flow.nodes.map((n) => [n.id, n]));
    const inEdges = new Map();
    const outEdges = new Map();
    for (const e of flow.edges.map(parseEdge)) {
        const outs = outEdges.get(e.fromNode) ?? [];
        outs.push(e);
        outEdges.set(e.fromNode, outs);
        const ins = inEdges.get(e.toNode) ?? [];
        ins.push(e);
        inEdges.set(e.toNode, ins);
    }
    const ready = [];
    for (const n of flow.nodes) {
        if ((inEdges.get(n.id) ?? []).length === 0) {
            ready.push(n.id);
        }
    }
    const executed = new Set();
    while (ready.length > 0) {
        const nodeId = ready.shift();
        if (executed.has(nodeId))
            continue;
        executed.add(nodeId);
        const cfg = nodes.get(nodeId);
        const handler = registry.get(cfg.type);
        const inputs = {};
        for (const e of inEdges.get(nodeId) ?? []) {
            inputs[e.toPort] = e.mailbox.shift();
        }
        yield { type: "NODE_START", nodeId };
        let output;
        let attempt = 0;
        while (true) {
            try {
                output = await withTimeout(handler.execute({
                    config: nodeConfig(cfg),
                    inputs,
                    context: ctx,
                    providers,
                }), DEFAULT_TIMEOUT_MS);
                break;
            }
            catch (err) {
                attempt++;
                if (attempt > DEFAULT_RETRIES) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    yield { type: "NODE_ERROR", nodeId, error };
                    throw error;
                }
            }
        }
        yield { type: "NODE_END", nodeId };
        for (const e of outEdges.get(nodeId) ?? []) {
            const val = output[e.fromPort];
            if (val !== undefined) {
                e.mailbox.push(val);
                yield {
                    type: "EDGE_EMIT",
                    from: `${e.fromNode}.${e.fromPort}`,
                    to: `${e.toNode}.${e.toPort}`,
                };
            }
            const incoming = inEdges.get(e.toNode) ?? [];
            const readyFlag = incoming.every((ie) => ie.mailbox.length > 0);
            if (readyFlag && !executed.has(e.toNode) && !ready.includes(e.toNode)) {
                ready.push(e.toNode);
            }
        }
    }
    return { outputs: ctx.outputs };
}
