import * as pb from "../proto/voide/v1/flow.js";
import { makeContext } from "../sdk/node.js";
import { Scheduler } from "./scheduler.js";
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRIES = 0;
function parseEdge(e) {
    return {
        id: e.id ?? "",
        fromNode: e.from?.node ?? "",
        fromPort: e.from?.port ?? "",
        toNode: e.to?.node ?? "",
        toPort: e.to?.port ?? "",
        type: e.type,
        mailbox: [],
    };
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
export async function* orchestrate(flowBin, runtimeInputs, registry, providers = {}, scheduler = new Scheduler(), runId) {
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
    const states = new Map();
    const ready = [];
    for (const n of flow.nodes) {
        states.set(n.id, "idle");
        if ((inEdges.get(n.id) ?? []).length === 0) {
            ready.push(n.id);
            states.set(n.id, "queued");
            yield {
                type: "node_state",
                runId,
                nodeId: n.id,
                state: "queued",
                at: Date.now(),
            };
        }
    }
    const executed = new Set();
    while (ready.length > 0) {
        await scheduler.next();
        ready.sort();
        const nodeId = ready.shift();
        if (executed.has(nodeId))
            continue;
        executed.add(nodeId);
        states.set(nodeId, "running");
        yield {
            type: "node_state",
            runId,
            nodeId,
            state: "running",
            at: Date.now(),
        };
        const cfg = nodes.get(nodeId);
        const handler = registry.get(cfg.type);
        const inputs = {};
        for (const e of inEdges.get(nodeId) ?? []) {
            if (inputs[e.toPort] === undefined && e.mailbox.length > 0) {
                inputs[e.toPort] = e.mailbox.shift();
            }
        }
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
                    states.set(nodeId, "error");
                    yield {
                        type: "node_state",
                        runId,
                        nodeId,
                        state: "error",
                        at: Date.now(),
                    };
                    yield {
                        type: "error",
                        runId,
                        nodeId,
                        code: "runtime",
                        message: error.message,
                        at: Date.now(),
                    };
                    throw error;
                }
            }
        }
        states.set(nodeId, "ok");
        yield {
            type: "node_state",
            runId,
            nodeId,
            state: "ok",
            at: Date.now(),
        };
        for (const e of outEdges.get(nodeId) ?? []) {
            const val = output[e.fromPort];
            if (val !== undefined) {
                e.mailbox.push(val);
                const bytes = JSON.stringify(val).length;
                yield {
                    type: "edge_transfer",
                    runId,
                    edgeId: e.id,
                    bytes,
                    at: Date.now(),
                };
            }
            const incoming = inEdges.get(e.toNode) ?? [];
            const portReady = new Map();
            for (const ie of incoming) {
                const hasVal = ie.mailbox.length > 0;
                const prev = portReady.get(ie.toPort) ?? false;
                portReady.set(ie.toPort, prev || hasVal);
            }
            const readyFlag = Array.from(portReady.values()).every(Boolean);
            if (readyFlag && !executed.has(e.toNode) && !ready.includes(e.toNode)) {
                ready.push(e.toNode);
                states.set(e.toNode, "queued");
                yield {
                    type: "node_state",
                    runId,
                    nodeId: e.toNode,
                    state: "queued",
                    at: Date.now(),
                };
            }
        }
    }
    return { outputs: ctx.outputs };
}
