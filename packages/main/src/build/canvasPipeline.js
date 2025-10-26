import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { compileAndCache, getCompiledFlow } from "../orchestrator/compilerCache.js";
import { getNode, listNodes } from "../orchestrator/nodeRegistry.js";
import { runFlow as orchestratorRunFlow, getLastRunPayloads } from "../orchestrator/engine.js";
import { emitRunPayloads } from "../ipc/telemetry.js";
const PLAN_VERSION = "1";
function toArray(value) {
    return Array.isArray(value) ? [...value] : [];
}
function normalizePortId(port) {
    if (!port)
        return null;
    if (typeof port.id === "string" && port.id.trim().length > 0) {
        return port.id.trim();
    }
    if (typeof port.port === "string" && port.port.trim().length > 0) {
        return port.port.trim();
    }
    return null;
}
function normalizePortTypes(port) {
    if (!port)
        return [];
    const raw = port.dtype ?? port.types;
    if (Array.isArray(raw)) {
        return raw
            .filter((value) => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim());
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
        return [raw.trim()];
    }
    return [];
}
function portIndexFor(nodes) {
    const index = new Map();
    for (const node of nodes) {
        const record = {
            in: new Map(),
            out: new Map(),
        };
        for (const dir of ["in", "out"]) {
            const ports = toArray(node[dir]);
            for (const entry of ports) {
                if (!entry || typeof entry !== "object")
                    continue;
                const id = normalizePortId(entry);
                if (!id)
                    continue;
                record[dir].set(id, normalizePortTypes(entry));
            }
        }
        index.set(node.id, record);
    }
    return index;
}
function normalizeEdgeEndpoint(endpoint, fallbackNode) {
    const nodeId = (typeof endpoint.node === "string" && endpoint.node.trim().length > 0 && endpoint.node.trim()) ||
        (typeof endpoint.nodeId === "string" && endpoint.nodeId.trim().length > 0 && endpoint.nodeId.trim()) ||
        (typeof endpoint.id === "string" && endpoint.id.trim().length > 0 && endpoint.id.trim()) ||
        (typeof endpoint.from === "string" && endpoint.from.trim().length > 0 && endpoint.from.trim()) ||
        fallbackNode;
    const portId = (typeof endpoint.port === "string" && endpoint.port.trim().length > 0 && endpoint.port.trim()) ||
        (typeof endpoint.handle === "string" && endpoint.handle.trim().length > 0 && endpoint.handle.trim()) ||
        (typeof endpoint.handleId === "string" && endpoint.handleId.trim().length > 0 && endpoint.handleId.trim()) ||
        null;
    if (!nodeId || !portId) {
        return null;
    }
    return { node: nodeId, port: portId };
}
function ensureAppReady() {
    if (app.isReady())
        return Promise.resolve();
    return app.whenReady();
}
function computeGraphHash(canvas) {
    const simplified = {
        id: canvas.id ?? null,
        version: canvas.version ?? null,
        params: canvas.params ?? {},
        nodes: canvas.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            params: node.params ?? {},
            in: toArray(node.in).map((port) => ({
                id: normalizePortId(port),
                types: normalizePortTypes(port),
            })),
            out: toArray(node.out).map((port) => ({
                id: normalizePortId(port),
                types: normalizePortTypes(port),
            })),
        })),
        edges: canvas.edges.map((edge) => ({
            id: edge.id ?? edge.key ?? null,
            from: normalizeEdgeEndpoint(edge.from),
            to: normalizeEdgeEndpoint(edge.to),
        })),
    };
    const json = JSON.stringify(simplified);
    return createHash("sha256").update(json).digest("hex");
}
function intersection(left, right) {
    if (left.length === 0 || right.length === 0)
        return [];
    const set = new Set(left);
    return right.filter((value) => set.has(value));
}
function formatList(values) {
    return Array.from(values).join(", ");
}
export function isCanvasBuildInput(payload) {
    if (!payload || typeof payload !== "object")
        return false;
    const graph = payload;
    if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges))
        return false;
    const nodes = graph.nodes;
    if (nodes.length === 0)
        return true;
    const firstNode = nodes.find((value) => value && typeof value === "object");
    if (firstNode && typeof firstNode.name === "string") {
        return false;
    }
    const edges = graph.edges;
    const structuredEdge = edges.find((edge) => edge && typeof edge === "object");
    if (!structuredEdge)
        return true;
    const candidate = structuredEdge;
    if (Array.isArray(candidate.from) || Array.isArray(candidate.to)) {
        return false;
    }
    return Boolean(candidate.from && typeof candidate.from === "object");
}
export function isCanvasRunPayload(payload) {
    if (!payload || typeof payload !== "object")
        return false;
    const candidate = payload;
    if (!candidate.plan || typeof candidate.plan !== "object")
        return false;
    const plan = candidate.plan;
    if (typeof plan.hash !== "string" || plan.hash.trim().length === 0)
        return false;
    if (!Array.isArray(plan.order))
        return false;
    return true;
}
function validateCanvas(canvas) {
    const errors = [];
    const nodeIndex = new Map();
    const portIndex = portIndexFor(canvas.nodes ?? []);
    const knownTypes = new Set(listNodes().map((node) => node.type));
    for (const node of canvas.nodes ?? []) {
        if (!node.id || typeof node.id !== "string") {
            errors.push("node:<unknown> missing id");
            continue;
        }
        if (nodeIndex.has(node.id)) {
            errors.push(`node:${node.id} duplicate id`);
            continue;
        }
        nodeIndex.set(node.id, node);
        if (!node.type || typeof node.type !== "string") {
            errors.push(`node:${node.id} missing type`);
            continue;
        }
        const type = node.type.trim();
        if (!knownTypes.has(type) && !getNode(type)) {
            errors.push(`node:${node.id} unknown type "${type}"`);
        }
    }
    const indegree = new Map();
    for (const nodeId of nodeIndex.keys()) {
        indegree.set(nodeId, 0);
    }
    for (const edge of canvas.edges ?? []) {
        if (!edge || typeof edge !== "object") {
            errors.push("edge:<unknown> invalid edge entry");
            continue;
        }
        const edgeId = edge.id || edge.key || "<unnamed>";
        const from = normalizeEdgeEndpoint(edge.from);
        if (!from) {
            errors.push(`edge:${edgeId} missing source endpoint`);
            continue;
        }
        const to = normalizeEdgeEndpoint(edge.to);
        if (!to) {
            errors.push(`edge:${edgeId} missing target endpoint`);
            continue;
        }
        if (!nodeIndex.has(from.node)) {
            errors.push(`edge:${edgeId} source node "${from.node}" not found`);
            continue;
        }
        if (!nodeIndex.has(to.node)) {
            errors.push(`edge:${edgeId} target node "${to.node}" not found`);
            continue;
        }
        const sourcePorts = portIndex.get(from.node)?.out ?? new Map();
        if (!sourcePorts.has(from.port)) {
            errors.push(`edge:${edgeId} source port ${from.node}.${from.port} missing`);
        }
        const targetPorts = portIndex.get(to.node)?.in ?? new Map();
        if (!targetPorts.has(to.port)) {
            errors.push(`edge:${edgeId} target port ${to.node}.${to.port} missing`);
        }
        if (sourcePorts.has(from.port) && targetPorts.has(to.port)) {
            const overlap = intersection(sourcePorts.get(from.port) ?? [], targetPorts.get(to.port) ?? []);
            if (overlap.length === 0 &&
                (sourcePorts.get(from.port)?.length ?? 0) > 0 &&
                (targetPorts.get(to.port)?.length ?? 0) > 0) {
                errors.push(`edge:${edgeId} incompatible port types ${from.node}.${from.port} -> ${to.node}.${to.port}`);
            }
        }
        indegree.set(to.node, (indegree.get(to.node) ?? 0) + 1);
    }
    const roots = Array.from(indegree.entries())
        .filter(([, degree]) => degree === 0)
        .map(([nodeId]) => nodeId);
    if (roots.length === 0) {
        errors.push("graph: missing entry node");
    }
    else if (roots.length > 1) {
        errors.push(`graph: multiple entry nodes (${formatList(roots)})`);
    }
    const order = [];
    const queue = roots.slice();
    const adjacency = new Map();
    for (const nodeId of nodeIndex.keys()) {
        adjacency.set(nodeId, new Set());
    }
    for (const edge of canvas.edges ?? []) {
        const from = normalizeEdgeEndpoint(edge.from);
        const to = normalizeEdgeEndpoint(edge.to);
        if (!from || !to)
            continue;
        adjacency.get(from.node)?.add(to.node);
    }
    for (let i = 0; i < queue.length; i += 1) {
        const current = queue[i];
        order.push(current);
        for (const next of adjacency.get(current) ?? []) {
            const degree = (indegree.get(next) ?? 0) - 1;
            indegree.set(next, degree);
            if (degree === 0) {
                queue.push(next);
            }
        }
    }
    if (order.length !== nodeIndex.size) {
        errors.push("graph: cycle detected");
    }
    return { errors, order, entry: roots.length === 1 ? roots[0] : null };
}
function toFlowGraph(canvas) {
    const nodes = (canvas.nodes ?? []).map((node) => ({
        id: node.id,
        type: node.type,
        name: typeof node.name === "string" && node.name.trim().length > 0 ? node.name : node.type,
        params: { ...(node.params ?? {}) },
        in: toArray(node.in)
            .map((port) => ({
            port: normalizePortId(port) ?? "",
            types: normalizePortTypes(port),
        }))
            .filter((entry) => entry.port.length > 0),
        out: toArray(node.out)
            .map((port) => ({
            port: normalizePortId(port) ?? "",
            types: normalizePortTypes(port),
        }))
            .filter((entry) => entry.port.length > 0),
    }));
    const edges = canvas.edges?.map((edge, index) => {
        const from = normalizeEdgeEndpoint(edge.from) ?? { node: "", port: "" };
        const to = normalizeEdgeEndpoint(edge.to) ?? { node: "", port: "" };
        return {
            id: edge.id ?? edge.key ?? `edge-${index}`,
            from: [from.node, from.port],
            to: [to.node, to.port],
            label: undefined,
        };
    }) ?? [];
    return {
        id: typeof canvas.id === "string" && canvas.id.trim().length > 0 ? canvas.id : "canvas-flow",
        version: typeof canvas.version === "string" && canvas.version.trim().length > 0 ? canvas.version : "1.0.0",
        nodes,
        edges,
        runtimeInputs: { ...(canvas.runtimeInputs ?? canvas.params?.runtimeInputs ?? {}) },
    };
}
function createPlan(canvas, metadata, hash) {
    const ops = {};
    for (const node of canvas.nodes ?? []) {
        ops[node.id] = {
            type: node.type,
            params: { ...(node.params ?? {}) },
        };
    }
    const routes = (canvas.edges ?? []).map((edge, index) => {
        const from = normalizeEdgeEndpoint(edge.from) ?? { node: "", port: "" };
        const to = normalizeEdgeEndpoint(edge.to) ?? { node: "", port: "" };
        return {
            id: edge.id ?? edge.key ?? `edge-${index}`,
            from,
            to,
        };
    });
    const graphHash = computeGraphHash(canvas);
    return {
        version: PLAN_VERSION,
        hash,
        order: metadata.order,
        entry: metadata.entry ?? (metadata.order[0] ?? ""),
        ops,
        routes,
        metadata: {
            nodes: canvas.nodes?.length ?? 0,
            edges: canvas.edges?.length ?? 0,
            createdAt: Date.now(),
            graphHash,
        },
    };
}
async function ensureFlowDirectory(hash) {
    await ensureAppReady();
    const base = path.join(app.getPath("userData"), "flows", hash);
    await fs.mkdir(base, { recursive: true });
    return base;
}
function runnableModuleSource(plan) {
    const serializedPlan = JSON.stringify(plan, null, 2);
    const banner = "// Auto-generated by VOIDE canvas build pipeline\n";
    return (banner +
        `export const hash = ${JSON.stringify(plan.hash)};\n` +
        `export const plan = ${serializedPlan};\n` +
        "export function getPlan() { return plan; }\n" +
        "export default { hash, plan };\n");
}
async function persistArtifacts(dir, plan, compiled) {
    const runnablePath = path.join(dir, "runnable.js");
    const planPath = path.join(dir, "plan.json");
    const flowPath = path.join(dir, "flow.json");
    const compiledPath = path.join(dir, "compiled.bin");
    const metaPath = path.join(dir, "meta.json");
    await Promise.all([
        fs.writeFile(runnablePath, runnableModuleSource(plan), "utf8"),
        fs.writeFile(planPath, JSON.stringify(plan, null, 2), "utf8"),
        fs.writeFile(flowPath, JSON.stringify(compiled.flow, null, 2), "utf8"),
        fs.writeFile(compiledPath, Buffer.from(compiled.bytes)),
        fs.writeFile(metaPath, JSON.stringify({
            hash: compiled.hash,
            version: compiled.version,
            cachedAt: compiled.cachedAt,
        }, null, 2), "utf8"),
    ]);
}
async function loadFlowFromDisk(dir) {
    const flowPath = path.join(dir, "flow.json");
    try {
        const content = await fs.readFile(flowPath, "utf8");
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object") {
            return parsed;
        }
    }
    catch (error) {
        console.warn(`Failed to read cached flow at ${flowPath}`, error);
    }
    return null;
}
export async function buildCanvasFlow(canvas) {
    const { errors, order, entry } = validateCanvas(canvas);
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    const flowGraph = toFlowGraph(canvas);
    const { entry: compiledEntry, cached } = compileAndCache(flowGraph);
    const dir = await ensureFlowDirectory(compiledEntry.hash);
    const plan = createPlan(canvas, { order, entry }, compiledEntry.hash);
    await persistArtifacts(dir, plan, compiledEntry);
    return {
        ok: true,
        hash: compiledEntry.hash,
        plan,
        outFile: path.join(dir, "runnable.js"),
        cached,
        dir,
        errors: [],
    };
}
export async function runCanvasFlow(payload) {
    try {
        if (!payload || !payload.plan) {
            return { ok: false, error: "Missing plan payload." };
        }
        const plan = payload.plan;
        const hash = typeof plan.hash === "string" && plan.hash.length > 0 ? plan.hash : undefined;
        if (!hash) {
            return { ok: false, error: "Plan is missing hash identifier." };
        }
        const compiled = getCompiledFlow(hash);
        let flow = compiled?.flow ?? null;
        if (!flow) {
            const dir = await ensureFlowDirectory(hash);
            flow = await loadFlowFromDisk(dir);
        }
        if (!flow) {
            return { ok: false, error: `Compiled flow not found for hash '${hash}'.` };
        }
        const result = await orchestratorRunFlow(flow, payload.input ?? {});
        const outputs = await getLastRunPayloads(result.runId);
        emitRunPayloads(result.runId, outputs);
        return {
            ok: true,
            hash,
            runId: result.runId,
            outputs,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: message };
    }
}
