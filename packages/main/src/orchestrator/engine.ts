import Piscina from "piscina";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import type { FlowDef, NodeDef, LLMParams, LoopParams, PayloadT, TextPayload, RuntimeProfile } from "@voide/shared";
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

type ManifestModel = {
  name?: string;
  filename?: string;
  type?: string;
  order?: string;
  embeddingModel?: boolean;
  maxTokens?: number | null;
  temperature?: number | null;
  runtime?: string | null;
  adapter?: string | null;
};

type RegistryModelWithStatus = {
  id: string;
  name: string;
  backend?: string;
  filename: string;
  sha256?: string;
  sizeBytes?: number;
  license?: string;
  url?: string;
  status: string;
};

const fsPromises = fs.promises;
const MODEL_MANIFEST_SEARCH_PATHS = [
  path.resolve(__dirname, "../../../../models/models.json"),
  path.resolve(process.cwd(), "models/models.json"),
];
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_RUNTIME: RuntimeProfile = "CPU";
const DEFAULT_ADAPTER: LLMParams["adapter"] = "llama.cpp";
const TYPE_ADAPTER_OVERRIDES: Record<string, LLMParams["adapter"] | undefined> = {
  falcon: "gpt4all",
  mpt: "gpt4all",
  replit: "gpt4all",
  bert: "gpt4all",
};
const TYPE_TEMPERATURE_OVERRIDES: Record<string, number | undefined> = {
  qwen2: 0.4,
  "qwen2.5": 0.4,
  llama3: 0.7,
  llama2: 0.7,
  llama: 0.7,
  deepseek: 0.3,
  mistral: 0.65,
  falcon: 0.6,
  mpt: 0.65,
  "phi-3": 0.55,
  openllama: 0.65,
  replit: 0.75,
  starcoder: 0.4,
  bert: 0.5,
};

let manifestModelsCache: ManifestModel[] | null = null;

function homeDir() {
  return process.env.HOME || process.env.USERPROFILE || ".";
}

async function loadManifestModels(): Promise<ManifestModel[]> {
  if (manifestModelsCache) {
    return manifestModelsCache;
  }
  for (const candidate of MODEL_MANIFEST_SEARCH_PATHS) {
    try {
      const raw = await fsPromises.readFile(candidate, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        manifestModelsCache = parsed as ManifestModel[];
        return manifestModelsCache;
      }
    } catch (error) {
      // ignore and continue to next candidate
    }
  }
  manifestModelsCache = [];
  return manifestModelsCache;
}

function normalizeKey(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function stripModelPrefix(value: string): string {
  return value.replace(/^model:/i, "");
}

function sanitizeModelId(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const sanitized = trimmed.replace(/\s+/g, "-").toLowerCase();
  if (!sanitized) return null;
  return sanitized.startsWith("model:") ? sanitized : `model:${sanitized}`;
}

function manifestIdCandidates(entry: ManifestModel): string[] {
  const out = new Set<string>();
  const baseCandidates = [entry.filename, entry.order, entry.name];
  for (const candidate of baseCandidates) {
    const normalized = normalizeKey(candidate);
    if (normalized) out.add(normalized);
    const sanitized = sanitizeModelId(candidate ?? undefined);
    if (sanitized) {
      const sanNormalized = normalizeKey(sanitized);
      if (sanNormalized) out.add(sanNormalized);
      const stripped = normalizeKey(stripModelPrefix(sanitized));
      if (stripped) out.add(stripped);
    }
  }
  return Array.from(out);
}

function manifestNameCandidates(entry: ManifestModel): string[] {
  const normalized = normalizeKey(entry.name);
  return normalized ? [normalized] : [];
}

function gatherParamCandidates(rawParams: Record<string, unknown>): {
  idCandidates: Set<string>;
  nameCandidates: Set<string>;
} {
  const idCandidates = new Set<string>();
  const nameCandidates = new Set<string>();
  const addId = (value: unknown) => {
    if (typeof value !== "string") return;
    const normalized = normalizeKey(value);
    if (!normalized) return;
    idCandidates.add(normalized);
    const stripped = normalizeKey(stripModelPrefix(normalized));
    if (stripped) idCandidates.add(stripped);
  };
  const addName = (value: unknown) => {
    if (typeof value !== "string") return;
    const normalized = normalizeKey(value);
    if (!normalized) return;
    nameCandidates.add(normalized);
  };

  addId(rawParams.modelId);
  addId((rawParams as any).model_id);
  addName((rawParams as any).modelName);
  addName((rawParams as any).modelLabel);
  addName((rawParams as any).displayName);
  addName((rawParams as any).title);
  addName((rawParams as any).label);

  if (typeof rawParams.model === "string") {
    addId(rawParams.model);
    addName(rawParams.model);
  } else if (rawParams.model && typeof rawParams.model === "object") {
    const modelRecord = rawParams.model as Record<string, unknown>;
    addId(modelRecord.id);
    addId(modelRecord.modelId);
    addId(modelRecord.model_id);
    addName(modelRecord.name);
    addName(modelRecord.label);
    addName(modelRecord.title);
  }

  return { idCandidates, nameCandidates };
}

function normalizeAdapter(value: unknown): LLMParams["adapter"] | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "llama.cpp":
    case "llamacpp":
    case "llama":
      return "llama.cpp";
    case "gpt4all":
      return "gpt4all";
    case "mock":
      return "mock";
    default:
      return undefined;
  }
}

function normalizeRuntime(value: unknown): RuntimeProfile | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "GPU") return "CUDA";
  if (normalized === "CUDA" || normalized === "CPU") return normalized as RuntimeProfile;
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toPositiveInt(value: unknown): number | undefined {
  const num = toNumber(value);
  if (num === undefined) return undefined;
  const rounded = Math.floor(num);
  return rounded > 0 ? rounded : undefined;
}

async function fileExists(p: string) {
  try {
    await fsPromises.access(p);
    return true;
  } catch {
    return false;
  }
}

function firstNonEmptyString(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

async function resolveModelFilePath(
  registryModel: RegistryModelWithStatus | null,
  manifestModel: ManifestModel | null,
  adapter: LLMParams["adapter"]
): Promise<string> {
  const baseDir = path.join(homeDir(), ".voide", "models");
  const candidates: string[] = [];
  if (registryModel?.id && registryModel.filename) {
    candidates.push(path.join(baseDir, registryModel.id, registryModel.filename));
    const stripped = stripModelPrefix(registryModel.id);
    if (stripped !== registryModel.id) {
      candidates.push(path.join(baseDir, stripped, registryModel.filename));
    }
  }
  if (manifestModel?.filename) {
    const ids = manifestIdCandidates(manifestModel);
    for (const id of ids) {
      if (!id) continue;
      candidates.push(path.join(baseDir, id, manifestModel.filename));
      const stripped = stripModelPrefix(id);
      if (stripped !== id) {
        candidates.push(path.join(baseDir, stripped, manifestModel.filename));
      }
    }
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (await fileExists(resolved)) {
      return resolved;
    }
  }

  if (adapter === "mock") {
    return manifestModel?.filename ?? registryModel?.filename ?? "";
  }

  const modelName = manifestModel?.name ?? registryModel?.name ?? "selected model";
  throw new Error(`Model file for "${modelName}" not found. Install the model before running this node.`);
}

async function resolveLLMJobConfig(rawParams: Record<string, unknown>): Promise<{
  params: LLMParams;
  modelFile: string;
  manifestModel: ManifestModel | null;
  registryModel: RegistryModelWithStatus | null;
}> {
  const manifestModels = await loadManifestModels();
  const { idCandidates, nameCandidates } = gatherParamCandidates(rawParams);

  const manifestModel = manifestModels.find((entry) => {
    const ids = manifestIdCandidates(entry);
    const names = manifestNameCandidates(entry);
    return (
      ids.some(id => idCandidates.has(id)) ||
      names.some(name => idCandidates.has(name) || nameCandidates.has(name))
    );
  }) ?? null;

  if (!manifestModel) {
    const label = firstNonEmptyString([
      rawParams.modelId as string | undefined,
      (rawParams as any).model_id,
      (rawParams as any).modelName,
      (rawParams as any).modelLabel,
    ]) ?? "unknown";
    throw new Error(`Selected model "${label}" not found in manifest.`);
  }

  const registry = await getModelRegistry();
  const combinedIdCandidates = new Set<string>(idCandidates);
  for (const id of manifestIdCandidates(manifestModel)) {
    combinedIdCandidates.add(id);
  }
  const combinedNameCandidates = new Set<string>(nameCandidates);
  for (const name of manifestNameCandidates(manifestModel)) {
    combinedNameCandidates.add(name);
  }
  if (manifestModel.filename) {
    const normalizedFilename = normalizeKey(manifestModel.filename);
    if (normalizedFilename) combinedNameCandidates.add(normalizedFilename);
  }

  const registryModel = (registry.models as RegistryModelWithStatus[]).find((entry) => {
    const values = new Set<string>();
    if (entry.id) {
      const normalizedId = normalizeKey(entry.id);
      if (normalizedId) values.add(normalizedId);
      const stripped = normalizeKey(stripModelPrefix(entry.id));
      if (stripped) values.add(stripped);
    }
    if (entry.name) {
      const name = normalizeKey(entry.name);
      if (name) values.add(name);
    }
    if (entry.filename) {
      const filename = normalizeKey(entry.filename);
      if (filename) values.add(filename);
      const sanitized = sanitizeModelId(entry.filename);
      if (sanitized) {
        const normalizedSanitized = normalizeKey(sanitized);
        if (normalizedSanitized) values.add(normalizedSanitized);
        const stripped = normalizeKey(stripModelPrefix(sanitized));
        if (stripped) values.add(stripped);
      }
    }
    return Array.from(values).some((value) => combinedIdCandidates.has(value) || combinedNameCandidates.has(value));
  }) ?? null;

  if (!registryModel) {
    const label = manifestModel.name ?? manifestModel.filename ?? "unknown";
    throw new Error(`Selected model "${label}" is not available in the local registry.`);
  }

  const paramAdapter = normalizeAdapter(rawParams.adapter);
  const manifestAdapter = normalizeAdapter(manifestModel.adapter);
  const registryAdapter = normalizeAdapter(registryModel.backend);
  const typeKey = normalizeKey(manifestModel.type) ?? "";
  const fallbackAdapter = TYPE_ADAPTER_OVERRIDES[typeKey] ?? DEFAULT_ADAPTER;
  const finalAdapter = paramAdapter ?? manifestAdapter ?? registryAdapter ?? fallbackAdapter;
  if (!finalAdapter) {
    throw new Error(`No adapter configured for model "${manifestModel.name ?? registryModel.name}".`);
  }

  const paramRuntime = normalizeRuntime(rawParams.runtime);
  const manifestRuntime = normalizeRuntime(manifestModel.runtime);
  const finalRuntime = paramRuntime ?? manifestRuntime ?? DEFAULT_RUNTIME;

  const reasonerOverride = (manifestModel.name ?? "").toLowerCase().includes("reasoner v1");
  const fallbackTemperature = reasonerOverride
    ? 0.2
    : TYPE_TEMPERATURE_OVERRIDES[typeKey] ?? DEFAULT_TEMPERATURE;
  const manifestTemperature = toNumber(manifestModel.temperature);
  const finalTemperature = toNumber(rawParams.temperature) ?? manifestTemperature ?? fallbackTemperature;
  if (finalTemperature === undefined) {
    throw new Error(`Missing temperature configuration for model "${manifestModel.name ?? registryModel.name}".`);
  }

  const manifestMaxTokens = toPositiveInt(manifestModel.maxTokens);
  const fallbackMaxTokens = manifestModel.embeddingModel ? undefined : DEFAULT_MAX_TOKENS;
  let finalMaxTokens = toPositiveInt(rawParams.maxTokens) ?? manifestMaxTokens ?? fallbackMaxTokens;
  if (finalMaxTokens === undefined) {
    throw new Error(`Missing maxTokens configuration for model "${manifestModel.name ?? registryModel.name}".`);
  }
  const enforceLimit = manifestMaxTokens ?? fallbackMaxTokens;
  if (enforceLimit !== undefined && finalMaxTokens > enforceLimit) {
    finalMaxTokens = enforceLimit;
  }

  const includeRawInput = rawParams.includeRawInput === true;

  const resolvedModelId = firstNonEmptyString([
    rawParams.modelId as string | undefined,
    (rawParams as any).model_id,
    registryModel.id,
    sanitizeModelId(manifestModel.filename ?? manifestModel.name ?? manifestModel.order ?? undefined) ?? undefined,
  ]);
  if (!resolvedModelId) {
    throw new Error(`Unable to determine model id for "${manifestModel.name ?? registryModel.name}".`);
  }

  const modelFile = await resolveModelFilePath(registryModel, manifestModel, finalAdapter);

  const params: LLMParams = {
    adapter: finalAdapter,
    modelId: resolvedModelId,
    temperature: finalTemperature,
    maxTokens: finalMaxTokens,
    runtime: finalRuntime,
  };
  if (includeRawInput) {
    params.includeRawInput = true;
  }

  return { params, modelFile, manifestModel, registryModel };
}

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
  const params = (node.params ?? {}) as Record<string, unknown>;
  const t0 = Date.now();
  if (node.type === "system.prompt") {
    const text = String(params["text"] ?? "");
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
    const { params: mergedParams, modelFile } = await resolveLLMJobConfig(params);
    const result = await poolLLM.run({
      params: mergedParams,
      prompt,
      modelFile,
    });
    const includeRawInput = mergedParams.includeRawInput === true;
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
    const stopOn = (params as unknown as LoopParams).stopOn;
    const maxIters = (params as unknown as LoopParams).maxIters ?? 1;
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
