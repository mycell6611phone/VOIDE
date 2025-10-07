import Piscina from "piscina";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import type { FlowDef, NodeDef, LLMParams, LoopParams, PayloadT, TextPayload } from "@voide/shared";
import { TelemetryEventType } from "@voide/shared";
import { topoOrder, Frontier, downstream } from "./scheduler.js";
import { getModelRegistry } from "../services/models.js";
import { recordRunLog, createRun, updateRunStatus, savePayload, getPayloadsForRun } from "../services/db.js";
import { emitSchedulerTelemetry } from "../services/telemetry.js";

type RunState = {
  runId: string;
  flow: FlowDef;
  frontier: Frontier;
  halted: boolean;
  iter: Map<string, number>;
  values: Map<string, PayloadT[]>;
  pktSeq: number;
  runtimeInputs: Record<string, unknown>;
};

const runs = new Map<string, RunState>();
const loopTasks = new Map<string, Promise<void>>();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PiscinaCtor = Piscina as any;
// Worker bundles live in packages/workers/dist. From the compiled file
// location (packages/main/dist/orchestrator) we need to traverse three
// directories up to reach the workspace root and then into workers/dist.
// Using only "../../" resulted in a path within the main package, causing
// runtime module resolution errors when Piscina attempted to load the
// workers. The extra "../" correctly points to the sibling package.
const poolLLM = new PiscinaCtor({ filename: path.join(__dirname, "../../../workers/dist/llm.js") });
const poolEmbed = new PiscinaCtor({ filename: path.join(__dirname, "../../../workers/dist/embed.js") });

function seedRuntimeInputs(st: RunState) {
  const entries = Object.entries(st.runtimeInputs ?? {});
  if (entries.length === 0) {
    return;
  }
  entries.forEach(([nodeId, raw]) => {
    try {
      const node = nodeById(st.flow, nodeId);
      const text = typeof raw === "string" ? raw : JSON.stringify(raw);
      const payload: PayloadT = { kind: "text", text };
      const outPorts = Array.isArray(node.out) ? node.out : [];
      outPorts.forEach((outPort) => {
        const key = portKey(node.id, outPort.port);
        st.values.set(key, [payload]);
        st.flow.edges
          .filter((edge) => edge.from[0] === node.id && edge.from[1] === outPort.port)
          .forEach((edge) => {
            st.frontier.add(edge.to[0]);
          });
      });
    } catch (error) {
      console.warn("Failed to seed runtime input", nodeId, error);
    }
  });
}

function nodeById(flow: FlowDef, id: string): NodeDef {
  const n = flow.nodes.find(n => n.id === id);
  if (!n) throw new Error(`node ${id} not found`);
  return n;
}
function portKey(nid: string, port: string) { return `${nid}:${port}`; }

export async function runFlow(flow: FlowDef, inputs: Record<string, unknown> = {}) {
  const runId = uuidv4();
  const order = topoOrder(flow);
  const f0 = new Frontier(order.filter(id => flow.edges.every(e => e.to[0] !== id)));
  const st: RunState = {
    runId,
    flow,
    frontier: f0,
    halted: false,
    iter: new Map(),
    values: new Map(),
    pktSeq: 0,
    runtimeInputs: inputs,
  };
  seedRuntimeInputs(st);
  runs.set(runId, st);
  await createRun(runId, flow.id);
  updateRunStatus(runId, "running");
  const loopPromise = loop(runId)
    .catch(err => {
      if (!st.halted) {
        updateRunStatus(runId, "error");
      }
      console.error(err);
    })
    .finally(() => {
      runs.delete(runId);
      loopTasks.delete(runId);
    });
  loopTasks.set(runId, loopPromise);
  return { runId };
}

export async function stopFlow(runId: string) {
  const st = runs.get(runId);
  if (!st) {
    return { ok: true };
  }
  if (!st.halted) {
    st.halted = true;
    updateRunStatus(runId, "stopped");
  }
  return { ok: true };
}
export async function stepFlow(_runId: string) { return { ok: true }; }

export async function getLastRunPayloads(runId: string) {
  return getPayloadsForRun(runId);
}

export function getNodeCatalog() {
  return [
    { type: "orchestrator", in: [{ port: "in", types: ["text","json","messages"] }], out: [{ port: "out", types: ["text","json","messages"] }] },
    { type: "critic", in: [{ port: "text", types: ["text"] }], out: [{ port: "notes", types: ["text"] }] },
    { type: "llm.generic", in: [{ port: "prompt", types: ["text"] }], out: [{ port: "completion", types: ["text"] }] },
    { type: "system.prompt", in: [], out: [{ port: "out", types: ["text"] }] },
    { type: "embedding", in: [{ port: "text", types: ["text"] }], out: [{ port: "vec", types: ["vector"] }] },
    { type: "retriever", in: [{ port: "vec", types: ["vector"] }], out: [{ port: "docs", types: ["json"] }] },
    { type: "vector.store", in: [{ port: "upsert", types: ["json","vector"] }], out: [{ port: "ok", types: ["json"] }] },
    { type: "loop", in: [{ port: "in", types: ["text"] }], out: [{ port: "body", types: ["text"] }, { port: "out", types: ["text"] }] },
    { type: "output", in: [{ port: "in", types: ["text","json"] }], out: [] }
  ];
}

async function loop(runId: string) {
  const st = runs.get(runId)!;
  while (!st.halted && st.frontier.hasReady()) {
    const nodeId = st.frontier.nextReady();
    const node = nodeById(st.flow, nodeId);
    emitSchedulerTelemetry({
      type: TelemetryEventType.NodeStart,
      payload: { id: node.id, span: st.runId },
    });
    try {
      const out = await executeNode(st, node);
      for (const [port, payload] of out) {
        st.values.set(portKey(node.id, port), [payload]);
        await savePayload(runId, node.id, port, payload);
        emitWireTransfers(st, node, port);
      }
      downstream(st.flow, node.id).forEach(n => st.frontier.add(n));
      emitSchedulerTelemetry({
        type: TelemetryEventType.NodeEnd,
        payload: { id: node.id, span: st.runId, ok: true },
      });
      emitSchedulerTelemetry({
        type: TelemetryEventType.AckClear,
        payload: { id: node.id, span: st.runId },
      });
    } catch (err: any) {
      const reason = String(err);
      await recordRunLog({
        type: "operation_progress",
        runId,
        nodeId,
        tokens: 0,
        latencyMs: 0,
        status: "error",
        reason,
      });
      emitSchedulerTelemetry({
        type: TelemetryEventType.NodeEnd,
        payload: { id: node.id, span: st.runId, ok: false, reason },
      });
      emitSchedulerTelemetry({
        type: TelemetryEventType.Stalled,
        payload: { id: node.id, span: st.runId, reason },
      });
    }
  }
  if (!st.halted) updateRunStatus(runId, "done");
}

let shutdownPromise: Promise<void> | null = null;

export async function shutdownOrchestrator() {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    const runIds = Array.from(runs.keys());
    await Promise.all(runIds.map((id) => stopFlow(id)));

    const loopPromises = Array.from(loopTasks.values()).map((task) =>
      task.catch((error) => {
        console.error("Loop shutdown error:", error);
      })
    );
    await Promise.all(loopPromises);

    runs.clear();
    loopTasks.clear();

    const pools = [poolLLM, poolEmbed];
    await Promise.all(
      pools.map((pool) => {
        if (pool && typeof pool.destroy === "function") {
          return pool.destroy();
        }
        return Promise.resolve();
      })
    );
  })()
    .catch((error) => {
      console.error("Failed to shutdown orchestrator:", error);
    });

  return shutdownPromise;
}

async function executeNode(st: RunState, node: NodeDef): Promise<Array<[string, any]>> {
  const params = node.params as any;
  const t0 = Date.now();
  if (node.type === "system.prompt") {
    const text = String(params.text ?? "");
    const dt = Date.now() - t0;
    await recordRunLog({
      type: "operation_progress",
      runId: st.runId,
      nodeId: node.id,
      tokens: text.split(/\s+/).length,
      latencyMs: dt,
      status: "ok",
    });
    return [["out", { kind: "text", text }]];
  }
  if (node.type === "llm.generic" || node.type === "critic") {
    const inputs = incomingText(st, node.id);
    const prompt = inputs.join("\n");
    const reg = await getModelRegistry();
    const model = reg.models.find((m: any) => m.id === params.modelId) as any;
    const result = await poolLLM.run({
      params,
      prompt,
      modelFile: model?.file ?? ""
    });
    const includeRawInput = Boolean((params as LLMParams).includeRawInput);
    const payload: TextPayload = { kind: "text", text: result.text };
    if (includeRawInput) {
      payload.rawInput = prompt;
    }
    await recordRunLog({
      type: "operation_progress",
      runId: st.runId,
      nodeId: node.id,
      tokens: result.tokens,
      latencyMs: result.latencyMs,
      status: "ok",
    });
    return [[node.type === "critic" ? "notes" : "completion", payload]];
  }
  if (node.type === "embedding") {
    const txt = incomingText(st, node.id).join("\n");
    const res = await poolEmbed.run({ text: txt });
    await recordRunLog({
      type: "operation_progress",
      runId: st.runId,
      nodeId: node.id,
      tokens: txt.split(/\s+/).length,
      latencyMs: 1,
      status: "ok",
    });
    return [["vec", { kind: "vector", values: res.values }]];
  }
  if (node.type === "loop") {
    const it = (st.iter.get(node.id) ?? 0) + 1; st.iter.set(node.id, it);
    const body = incomingText(st, node.id).join("\n");
    const stopOn = (params as LoopParams).stopOn;
    const maxIters = (params as LoopParams).maxIters ?? 1;
    const done = (stopOn && body.includes(stopOn)) || it >= maxIters;
    const out: Array<[string, any]> = [];
    out.push(["body", { kind: "text", text: body + (done ? "\nDONE" : "\n") }]);
    if (done) out.push(["out", { kind: "text", text: body }]);
    await recordRunLog({
      type: "operation_progress",
      runId: st.runId,
      nodeId: node.id,
      tokens: body.split(/\s+/).length,
      latencyMs: Date.now() - t0,
      status: "ok",
    });
    return out;
  }
  if (node.type === "output") {
    const body = incomingText(st, node.id).join("\n");
    await recordRunLog({
      type: "operation_progress",
      runId: st.runId,
      nodeId: node.id,
      tokens: body.split(/\s+/).length,
      latencyMs: Date.now() - t0,
      status: "ok",
    });
    return [];
  }
  throw new Error(`unknown node type ${node.type}`);
}

function emitWireTransfers(st: RunState, node: NodeDef, port: string) {
  const edges = st.flow.edges.filter((e) => e.from[0] === node.id && e.from[1] === port);
  for (const edge of edges) {
    const pkt = ++st.pktSeq;
    emitSchedulerTelemetry({
      type: TelemetryEventType.WireTransfer,
      payload: {
        id: edge.id ?? `${node.id}:${port}->${edge.to[0]}:${edge.to[1]}`,
        span: st.runId,
        pkt,
        from: node.id,
        to: edge.to[0],
        outPort: port,
        inPort: edge.to[1],
        ok: true,
      },
    });
  }
}

function incomingText(st: RunState, nodeId: string): string[] {
  const ins = st.flow.edges.filter(e => e.to[0] === nodeId);
  const texts: string[] = [];
  for (const e of ins) {
    const vs = st.values.get(`${e.from[0]}:${e.from[1]}`) ?? [];
    vs.forEach(v => { if (v.kind === "text") texts.push(v.text); });
  }
  return texts;
}
