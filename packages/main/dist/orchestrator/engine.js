import Piscina from "piscina";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { topoOrder, Frontier, downstream } from "./scheduler.js";
import { getModelRegistry } from "../services/models.js";
import { recordRunLog, createRun, updateRunStatus, savePayload, getPayloadsForRun } from "../services/db.js";
const runs = new Map();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PiscinaCtor = Piscina;
const poolLLM = new PiscinaCtor({ filename: path.join(__dirname, "../../workers/dist/llm.js") });
const poolEmbed = new PiscinaCtor({ filename: path.join(__dirname, "../../workers/dist/embed.js") });
function nodeById(flow, id) {
    const n = flow.nodes.find(n => n.id === id);
    if (!n)
        throw new Error(`node ${id} not found`);
    return n;
}
function portKey(nid, port) { return `${nid}:${port}`; }
export async function runFlow(flow) {
    const runId = uuidv4();
    const order = topoOrder(flow);
    const f0 = new Frontier(order.filter(id => flow.edges.every(e => e.to[0] !== id)));
    const st = { runId, flow, frontier: f0, halted: false, iter: new Map(), values: new Map() };
    runs.set(runId, st);
    await createRun(runId, flow.id);
    updateRunStatus(runId, "running");
    loop(runId).catch(err => { updateRunStatus(runId, "error"); console.error(err); });
    return { runId };
}
export async function stopFlow(runId) { const st = runs.get(runId); if (st)
    st.halted = true; return { ok: true }; }
export async function stepFlow(_runId) { return { ok: true }; }
export async function getLastRunPayloads(runId) {
    return getPayloadsForRun(runId);
}
export function getNodeCatalog() {
    return [
        { type: "orchestrator", in: [{ port: "in", types: ["text", "json", "messages"] }], out: [{ port: "out", types: ["text", "json", "messages"] }] },
        { type: "critic", in: [{ port: "text", types: ["text"] }], out: [{ port: "notes", types: ["text"] }] },
        { type: "llm.generic", in: [{ port: "prompt", types: ["text"] }], out: [{ port: "completion", types: ["text"] }] },
        { type: "system.prompt", in: [], out: [{ port: "out", types: ["text"] }] },
        { type: "embedding", in: [{ port: "text", types: ["text"] }], out: [{ port: "vec", types: ["vector"] }] },
        { type: "retriever", in: [{ port: "vec", types: ["vector"] }], out: [{ port: "docs", types: ["json"] }] },
        { type: "vector.store", in: [{ port: "upsert", types: ["json", "vector"] }], out: [{ port: "ok", types: ["json"] }] },
        { type: "loop", in: [{ port: "in", types: ["text"] }], out: [{ port: "body", types: ["text"] }, { port: "out", types: ["text"] }] },
        { type: "output", in: [{ port: "in", types: ["text", "json"] }], out: [] }
    ];
}
async function loop(runId) {
    const st = runs.get(runId);
    while (!st.halted && st.frontier.hasReady()) {
        const nodeId = st.frontier.nextReady();
        const node = nodeById(st.flow, nodeId);
        try {
            const out = await executeNode(st, node);
            for (const [port, payload] of out) {
                st.values.set(portKey(node.id, port), [payload]);
                await savePayload(runId, node.id, port, payload);
            }
            downstream(st.flow, node.id).forEach(n => st.frontier.add(n));
        }
        catch (err) {
            await recordRunLog({ runId, nodeId, tokens: 0, latencyMs: 0, status: 'error', error: String(err) });
        }
    }
    if (!st.halted)
        updateRunStatus(runId, "done");
}
async function executeNode(st, node) {
    const params = node.params;
    const t0 = Date.now();
    if (node.type === "system.prompt") {
        const text = String(params.text ?? "");
        const dt = Date.now() - t0;
        await recordRunLog({ runId: st.runId, nodeId: node.id, tokens: text.split(/\s+/).length, latencyMs: dt, status: 'ok' });
        return [["out", { kind: "text", text }]];
    }
    if (node.type === "llm.generic" || node.type === "critic") {
        const inputs = incomingText(st, node.id);
        const prompt = inputs.join("\n");
        const reg = await getModelRegistry();
        const model = reg.models.find((m) => m.id === params.modelId);
        const result = await poolLLM.run({
            params,
            prompt,
            modelFile: model?.file ?? ""
        });
        await recordRunLog({ runId: st.runId, nodeId: node.id, tokens: result.tokens, latencyMs: result.latencyMs, status: 'ok' });
        return [[node.type === "critic" ? "notes" : "completion", { kind: "text", text: result.text }]];
    }
    if (node.type === "embedding") {
        const txt = incomingText(st, node.id).join("\n");
        const res = await poolEmbed.run({ text: txt });
        await recordRunLog({ runId: st.runId, nodeId: node.id, tokens: txt.split(/\s+/).length, latencyMs: 1, status: 'ok' });
        return [["vec", { kind: "vector", values: res.values }]];
    }
    if (node.type === "loop") {
        const it = (st.iter.get(node.id) ?? 0) + 1;
        st.iter.set(node.id, it);
        const body = incomingText(st, node.id).join("\n");
        const stopOn = params.stopOn;
        const maxIters = params.maxIters ?? 1;
        const done = (stopOn && body.includes(stopOn)) || it >= maxIters;
        const out = [];
        out.push(["body", { kind: "text", text: body + (done ? "\nDONE" : "\n") }]);
        if (done)
            out.push(["out", { kind: "text", text: body }]);
        await recordRunLog({ runId: st.runId, nodeId: node.id, tokens: body.split(/\s+/).length, latencyMs: Date.now() - t0, status: 'ok' });
        return out;
    }
    if (node.type === "output") {
        const body = incomingText(st, node.id).join("\n");
        await recordRunLog({ runId: st.runId, nodeId: node.id, tokens: body.split(/\s+/).length, latencyMs: Date.now() - t0, status: 'ok' });
        return [];
    }
    throw new Error(`unknown node type ${node.type}`);
}
function incomingText(st, nodeId) {
    const ins = st.flow.edges.filter(e => e.to[0] === nodeId);
    const texts = [];
    for (const e of ins) {
        const vs = st.values.get(`${e.from[0]}:${e.from[1]}`) ?? [];
        vs.forEach(v => { if (v.kind === "text")
            texts.push(v.text); });
    }
    return texts;
}
