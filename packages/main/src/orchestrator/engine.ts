import Piscina from "piscina";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import type { FlowDef, NodeDef, LLMParams, LoopParams, PayloadT, TextPayload, RuntimeProfile } from "@voide/shared";
import { TelemetryEventType } from "@voide/shared";
import { topoOrder, Frontier, downstream } from "./scheduler.js";
import {
  clearAndRegister,
  getNode,
  listNodes,
  type ExecCtx,
  type NodeExecutionResult,
  type NodeImpl,
} from "./nodeRegistry.js";
import { getModelRegistry } from "../services/models.js";
import { getSecretsService } from "../services/secrets.js";
import {
  recordRunLog,
  createRun,
  updateRunStatus,
  savePayload,
  getPayloadsForRun,
  insertLogEntry,
  readMemory,
  writeMemory,
  appendMemory,
} from "../services/db.js";
import { emitSchedulerTelemetry } from "../services/telemetry.js";
import { invokeTool } from "../services/tools.js";

type RunState = {
  runId: string;
  flow: FlowDef;
  frontier: Frontier;
  halted: boolean;
  iter: Map<string, number>;
  values: Map<string, PayloadT[]>;
  pktSeq: number;
  runtimeInputs: Record<string, unknown>;
  nodeState: Map<string, unknown>;
};

const runs = new Map<string, RunState>();
const loopTasks = new Map<string, Promise<void>>();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PiscinaCtor = Piscina as any;

type PiscinaInstance = InstanceType<typeof PiscinaCtor>;
const LLM_WORKER_CANDIDATES = [
  "../../../workers/dist/llm.js",
  "../../../workers/dist/src/llm.js",
];
let poolLLM: PiscinaInstance | null = null;
let llmWorkerMissingLogged = false;
let llmFallbackLogged = false;

function resolveLLMWorkerEntry(): string | null {
  for (const relative of LLM_WORKER_CANDIDATES) {
    const candidate = path.resolve(__dirname, relative);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function ensureLLMPool(): PiscinaInstance | null {
  if (poolLLM) {
    return poolLLM;
  }
  const workerEntry = resolveLLMWorkerEntry();
  if (!workerEntry) {
    if (!llmWorkerMissingLogged) {
      console.warn(
        "[orchestrator] LLM worker bundle not found. Falling back to in-process execution. Run `pnpm --filter @voide/workers build` to enable threaded LLMs."
      );
      llmWorkerMissingLogged = true;
    }
    return null;
  }
  try {
    poolLLM = new PiscinaCtor({ filename: workerEntry });
    return poolLLM;
  } catch (error) {
    console.error("[orchestrator] Failed to initialize LLM worker:", error);
    return null;
  }
}

type LLMWorkerJob = {
  params: LLMParams & { includeRawInput?: boolean };
  prompt: string;
  modelFile: string;
};

type LLMWorkerResult = { text: string; tokens?: number; latencyMs?: number };

async function runLLMWithFallback(job: LLMWorkerJob): Promise<LLMWorkerResult> {
  const pool = ensureLLMPool();
  if (pool) {
    try {
      return await pool.run(job);
    } catch (error) {
      console.error("[orchestrator] LLM worker execution failed, retrying in-process:", error);
      poolLLM = null;
    }
  }
  return runLLMInline(job);
}

async function runLLMInline(job: LLMWorkerJob): Promise<LLMWorkerResult> {
  const start = Date.now();
  const adapter = job.params.adapter ?? DEFAULT_ADAPTER;
  if (!llmFallbackLogged && adapter !== "mock") {
    console.warn(
      `[orchestrator] Adapter "${adapter}" requested without worker bundle; falling back to mock responses.`
    );
    llmFallbackLogged = true;
  }
  const text = runMockFallback(job.prompt ?? "");
  return {
    text,
    tokens: countTokens(text),
    latencyMs: Date.now() - start,
  };
}

function runMockFallback(prompt: string): string {
  const lines = prompt.split(/\n/).slice(-4).join(" ").slice(0, 400);
  const verdict = /DONE/i.test(prompt) ? "DONE" : "CONTINUE";
  const summary = lines.replace(/\s+/g, " ").trim();
  return `Thought: ${summary}\nDecision: ${verdict}`;
}

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
  adapter?: string | null;
  runtime?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  type?: string | null;
  defaults?: unknown;
  defaultConfig?: unknown;
  params?: unknown;
  config?: unknown;
};

type RegistryModelDefaults = {
  adapter?: LLMParams["adapter"];
  runtime?: RuntimeProfile;
  temperature?: number;
  maxTokens?: number;
  type?: string | null;
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

function addNormalizedVariants(target: Set<string>, value: string | null | undefined) {
  if (!value || typeof value !== "string") return;
  const normalized = normalizeKey(value);
  if (!normalized) return;
  target.add(normalized);
  const compact = normalized.replace(/[^a-z0-9]+/g, "");
  if (compact) target.add(compact);
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
    addNormalizedVariants(out, candidate);
    const sanitized = sanitizeModelId(candidate ?? undefined);
    if (sanitized) {
      addNormalizedVariants(out, sanitized);
      const stripped = stripModelPrefix(sanitized);
      if (stripped !== sanitized) {
        addNormalizedVariants(out, stripped);
      }
    }
  }
  return Array.from(out);
}

function manifestNameCandidates(entry: ManifestModel): string[] {
  const out = new Set<string>();
  addNormalizedVariants(out, entry.name);
  return Array.from(out);
}

function gatherParamCandidates(rawParams: Record<string, unknown>): {
  idCandidates: Set<string>;
  nameCandidates: Set<string>;
} {
  const idCandidates = new Set<string>();
  const nameCandidates = new Set<string>();
  const addId = (value: unknown) => {
    if (typeof value !== "string") return;
    addNormalizedVariants(idCandidates, value);
    const sanitized = sanitizeModelId(value);
    if (sanitized) {
      addNormalizedVariants(idCandidates, sanitized);
      const stripped = stripModelPrefix(sanitized);
      if (stripped !== sanitized) {
        addNormalizedVariants(idCandidates, stripped);
      }
    }
  };
  const addName = (value: unknown) => {
    if (typeof value !== "string") return;
    addNormalizedVariants(nameCandidates, value);
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

function extractRegistryDefaults(registryModel: RegistryModelWithStatus | null): RegistryModelDefaults {
  const defaults: RegistryModelDefaults = {};
  if (!registryModel) {
    return defaults;
  }

  const queue: unknown[] = [
    registryModel.defaults,
    registryModel.defaultConfig,
    registryModel.params,
    registryModel.config,
    registryModel,
  ];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") {
      continue;
    }
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    const source = current as Record<string, unknown>;

    if (defaults.adapter === undefined) {
      const adapterCandidates = [
        source["adapter"],
        source["backend"],
        source["defaultAdapter"],
      ];
      for (const candidate of adapterCandidates) {
        const normalized = normalizeAdapter(candidate);
        if (normalized) {
          defaults.adapter = normalized;
          break;
        }
      }
    }

    if (defaults.runtime === undefined) {
      const runtimeCandidates = [
        source["runtime"],
        source["defaultRuntime"],
        source["runtimeProfile"],
      ];
      for (const candidate of runtimeCandidates) {
        const normalized = normalizeRuntime(candidate);
        if (normalized) {
          defaults.runtime = normalized;
          break;
        }
      }
    }

    if (defaults.temperature === undefined) {
      const temperatureCandidates = [
        source["temperature"],
        source["defaultTemperature"],
      ];
      for (const candidate of temperatureCandidates) {
        const value = toNumber(candidate);
        if (value !== undefined) {
          defaults.temperature = value;
          break;
        }
      }
    }

    if (defaults.maxTokens === undefined) {
      const maxTokenCandidates = [
        source["maxTokens"],
        source["defaultMaxTokens"],
        source["context"],
        source["contextLength"],
        source["contextWindow"],
        source["context_length"],
        source["context_window"],
      ];
      for (const candidate of maxTokenCandidates) {
        const value = toPositiveInt(candidate);
        if (value !== undefined) {
          defaults.maxTokens = value;
          break;
        }
      }
    }

    if (defaults.type === undefined) {
      const typeCandidates = [
        source["type"],
        source["modelType"],
        source["backendType"],
      ];
      for (const candidate of typeCandidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          defaults.type = candidate;
          break;
        }
      }
    }

    const nestedKeys = ["defaults", "params", "config", "settings", "llm", "model"];
    for (const key of nestedKeys) {
      const nested = source[key];
      if (nested && typeof nested === "object" && !seen.has(nested)) {
        queue.push(nested);
      }
    }
  }

  return defaults;
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
  const secrets = getSecretsService();
  let baseDir = path.join(homeDir(), ".voide", "models");
  try {
    const { value } = await secrets.get("paths", "modelsDir");
    if (typeof value === "string" && value.trim()) {
      baseDir = path.resolve(value);
    }
  } catch (error) {
    console.warn("Failed to read models directory secret, falling back to default:", error);
  }
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

  const registry = await getModelRegistry();
  const combinedIdCandidates = new Set<string>(idCandidates);
  const combinedNameCandidates = new Set<string>(nameCandidates);
  if (manifestModel) {
    for (const id of manifestIdCandidates(manifestModel)) {
      combinedIdCandidates.add(id);
    }
    for (const name of manifestNameCandidates(manifestModel)) {
      combinedNameCandidates.add(name);
    }
    if (manifestModel.filename) {
      addNormalizedVariants(combinedNameCandidates, manifestModel.filename);
    }
  }

  const registryModel = (registry.models as RegistryModelWithStatus[]).find((entry) => {
    const values = new Set<string>();
    addNormalizedVariants(values, entry.id);
    if (typeof entry.id === "string") {
      const sanitizedId = sanitizeModelId(entry.id);
      if (sanitizedId) {
        addNormalizedVariants(values, sanitizedId);
        const stripped = stripModelPrefix(sanitizedId);
        if (stripped !== sanitizedId) {
          addNormalizedVariants(values, stripped);
        }
      }
    }
    addNormalizedVariants(values, entry.name);
    addNormalizedVariants(values, entry.filename);
    if (typeof entry.filename === "string") {
      const sanitizedFilename = sanitizeModelId(entry.filename);
      if (sanitizedFilename) {
        addNormalizedVariants(values, sanitizedFilename);
        const stripped = stripModelPrefix(sanitizedFilename);
        if (stripped !== sanitizedFilename) {
          addNormalizedVariants(values, stripped);
        }
      }
    }
    return Array.from(values).some((value) => combinedIdCandidates.has(value) || combinedNameCandidates.has(value));
  }) ?? null;

  const modelLabel = firstNonEmptyString([
    manifestModel?.name,
    manifestModel?.filename,
    rawParams.modelId as string | undefined,
    (rawParams as any).model_id,
    (rawParams as any).modelName,
    (rawParams as any).modelLabel,
    registryModel?.name,
    registryModel?.id,
  ]) ?? "selected model";

  if (!registryModel) {
    throw new Error(`Selected model "${modelLabel}" is not available in the local registry.`);
  }

  const registryDefaults = extractRegistryDefaults(registryModel);
  const paramAdapter = normalizeAdapter(rawParams.adapter);
  const manifestAdapter = normalizeAdapter(manifestModel?.adapter);
  const registryBackendAdapter = normalizeAdapter(registryModel.backend ?? registryModel.adapter);
  const typeSource = manifestModel?.type ?? registryDefaults.type ?? registryModel.type ?? registryModel.backend;
  const typeKey = normalizeKey(typeof typeSource === "string" ? typeSource : undefined) ?? "";
  const fallbackAdapter = TYPE_ADAPTER_OVERRIDES[typeKey] ?? DEFAULT_ADAPTER;
  const finalAdapter = paramAdapter ?? registryDefaults.adapter ?? manifestAdapter ?? registryBackendAdapter ?? fallbackAdapter;
  if (finalAdapter === "mock") {
    throw new Error(
      `The mock adapter for model "${modelLabel}" has been disabled. Choose a llama.cpp or gpt4all configuration instead.`
    );
  }
  if (!finalAdapter) {
    throw new Error(`No adapter configured for model "${modelLabel}".`);
  }

  const paramRuntime = normalizeRuntime(rawParams.runtime);
  const manifestRuntime = normalizeRuntime(manifestModel?.runtime);
  const finalRuntime = paramRuntime ?? registryDefaults.runtime ?? manifestRuntime ?? DEFAULT_RUNTIME;

  const reasonerOverride = (manifestModel?.name ?? registryModel.name ?? "").toLowerCase().includes("reasoner v1");
  const manifestTemperature = toNumber(manifestModel?.temperature);
  const finalTemperature =
    toNumber(rawParams.temperature) ??
    registryDefaults.temperature ??
    manifestTemperature ??
    (reasonerOverride
      ? 0.2
      : TYPE_TEMPERATURE_OVERRIDES[typeKey] ?? DEFAULT_TEMPERATURE);

  if (finalTemperature === undefined) {
    throw new Error(`Missing temperature configuration for model "${modelLabel}".`);
  }

  const manifestMaxTokens = toPositiveInt(manifestModel?.maxTokens);
  const registryMaxTokens = registryDefaults.maxTokens;
  const defaultMaxTokens = manifestModel?.embeddingModel ? undefined : DEFAULT_MAX_TOKENS;
  let finalMaxTokens =
    toPositiveInt(rawParams.maxTokens) ??
    registryMaxTokens ??
    manifestMaxTokens ??
    defaultMaxTokens;
  if (finalMaxTokens === undefined) {
    throw new Error(`Missing maxTokens configuration for model "${modelLabel}".`);
  }
  const enforceLimit = registryMaxTokens ?? manifestMaxTokens ?? defaultMaxTokens;
  if (enforceLimit !== undefined && finalMaxTokens > enforceLimit) {
    finalMaxTokens = enforceLimit;
  }

  const includeRawInput = rawParams.includeRawInput === true;

  const resolvedModelId = firstNonEmptyString([
    rawParams.modelId as string | undefined,
    (rawParams as any).model_id,
    registryModel.id,
    sanitizeModelId(registryModel.id) ?? undefined,
    sanitizeModelId(manifestModel?.filename ?? manifestModel?.name ?? manifestModel?.order ?? undefined) ?? undefined,
  ]);
  if (!resolvedModelId) {
    throw new Error(`Unable to determine model id for "${modelLabel}".`);
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

function clonePayload(payload: PayloadT): PayloadT {
  try {
    return typeof structuredClone === "function" ? structuredClone(payload) : JSON.parse(JSON.stringify(payload));
  } catch {
    return JSON.parse(JSON.stringify(payload));
  }
}

function clonePayloadArray(payloads: PayloadT[]): PayloadT[] {
  return payloads.map(clonePayload);
}

function cloneInputsMap(map: Map<string, PayloadT[]>): Map<string, PayloadT[]> {
  const out = new Map<string, PayloadT[]>();
  for (const [port, payloads] of map.entries()) {
    out.set(port, clonePayloadArray(payloads));
  }
  return out;
}

function collectIncomingPayloads(st: RunState, nodeId: string): Map<string, PayloadT[]> {
  const map = new Map<string, PayloadT[]>();
  for (const edge of st.flow.edges) {
    if (edge.to[0] !== nodeId) {
      continue;
    }
    const key = `${edge.from[0]}:${edge.from[1]}`;
    const payloads = st.values.get(key);
    if (!payloads || payloads.length === 0) {
      continue;
    }
    const existing = map.get(edge.to[1]);
    if (existing) {
      existing.push(...payloads.map(clonePayload));
    } else {
      map.set(edge.to[1], payloads.map(clonePayload));
    }
  }
  return map;
}

function countTokens(text: string): number {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function normalizeNamespace(value: unknown): string {
  if (typeof value !== "string") {
    return "default";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "default";
}

function extractRuntimeMessage(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidateKeys = ["message", "text", "content", "value"];
    for (const key of candidateKeys) {
      const raw = record[key];
      if (typeof raw === "string" && raw.trim().length > 0) {
        return raw;
      }
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return null;
}

function renderTemplate(template: string, vars: Record<string, unknown>): string {
  const tpl = typeof template === "string" ? template : "";
  if (!tpl.trim()) {
    const direct = vars.input;
    return typeof direct === "string" ? direct : "";
  }
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => {
    const path = key.split(".");
    let current: unknown = vars;
    for (const segment of path) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    if (current === undefined || current === null) {
      return "";
    }
    return String(current);
  });
}

function payloadToArgs(payload: PayloadT): unknown {
  if (payload.kind === "json") {
    return payload.value;
  }
  if (payload.kind === "text") {
    const text = payload.text ?? "";
    const trimmed = text.trim();
    if (!trimmed) {
      return "";
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return text;
    }
  }
  return payload;
}

const chatInputNode: NodeImpl = {
  type: "chat.input",
  label: "ChatInput",
  inputs: [{ port: "response", types: ["text", "json"] }],
  outputs: [{ port: "text", types: ["text"] }],
  params: { message: "" },
  async execute(ctx) {
    const params = (ctx.node.params ?? {}) as Record<string, unknown>;
    let message = extractRuntimeMessage(ctx.runtimeInput);
    if (!message) {
      const responses = ctx.getText("response");
      if (responses.length > 0) {
        message = responses[responses.length - 1];
      }
    }
    if (!message && typeof params.message === "string") {
      message = params.message;
    }
    const text = message ?? "";
    await ctx.recordProgress({ tokens: countTokens(text), latencyMs: 0, status: "ok" });
    return [{ port: "text", payload: { kind: "text", text } }];
  },
};

const promptNode: NodeImpl = {
  type: "prompt",
  label: "Prompt",
  inputs: [{ port: "vars", types: ["json", "text"] }],
  outputs: [{ port: "text", types: ["text"] }],
  params: { template: "" },
  async execute(ctx) {
    const payloads = ctx.getInput("vars");
    const vars: Record<string, unknown> = {};
    for (const payload of payloads) {
      if (payload.kind === "json" && payload.value && typeof payload.value === "object") {
        Object.assign(vars, payload.value as Record<string, unknown>);
      }
      if (payload.kind === "text") {
        vars.input = payload.text;
      }
    }
    if (!("input" in vars)) {
      const runtime = extractRuntimeMessage(ctx.runtimeInput);
      if (runtime) {
        vars.input = runtime;
      }
    }
    const params = (ctx.node.params ?? {}) as Record<string, unknown>;
    const template = typeof params.template === "string" ? params.template : "";
    const rendered = renderTemplate(template, vars);
    await ctx.recordProgress({ tokens: countTokens(rendered), latencyMs: 0, status: "ok" });
    return [{ port: "text", payload: { kind: "text", text: rendered } }];
  },
};

const llmNode: NodeImpl = {
  type: "llm",
  label: "LLM",
  inputs: [{ port: "prompt", types: ["text"] }],
  outputs: [{ port: "text", types: ["text"] }],
  params: {
    adapter: "llama.cpp",
    runtime: "CPU",
    temperature: 0.7,
    maxTokens: 2048,
  },
  async execute(ctx) {
    const prompts = ctx.getText("prompt");
    const prompt = prompts.join("\n");
    const started = ctx.now();
    const { params, modelFile } = await resolveLLMJobConfig(ctx.node.params ?? {});

    const result = await runLLMWithFallback({ params, prompt, modelFile });

    const payload: TextPayload = { kind: "text", text: result.text };
    if (params.includeRawInput) {
      payload.rawInput = prompt;
    }
    await ctx.recordProgress({
      tokens: typeof result.tokens === "number" ? result.tokens : countTokens(result.text),
      latencyMs: ctx.now() - started,
      status: "ok",
    });
    return [{ port: "text", payload }];
  },
};

const debateLoopNode: NodeImpl = {
  type: "debate.loop",
  label: "Debate/Loop",
  inputs: [{ port: "text", types: ["text"] }],
  outputs: [{ port: "text", types: ["text"] }],
  params: { iterations: 2, reducer: "last" },
  async execute(ctx) {
    const params = (ctx.node.params ?? {}) as Record<string, unknown>;
    const iterations = Math.max(1, toPositiveInt(params.iterations) ?? 2);
    const reducer = typeof params.reducer === "string" ? params.reducer.toLowerCase() : "last";
    const input = ctx.getText("text").join("\n");
    const rounds: string[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const prefix = iterations > 1 ? `Round ${i + 1}: ` : "";
      rounds.push(`${prefix}${input}`.trim());
    }
    const output = reducer === "concat" ? rounds.join("\n\n") : rounds[rounds.length - 1] ?? input;
    await ctx.recordProgress({ tokens: countTokens(output), latencyMs: 0, status: "ok" });
    return [{ port: "text", payload: { kind: "text", text: output } }];
  },
};

const cacheNode: NodeImpl = {
  type: "cache",
  label: "Cache",
  inputs: [{ port: "text", types: ["text"] }],
  outputs: [{ port: "text", types: ["text"] }],
  params: { strategy: "read-through", key: "" },
  async execute(ctx) {
    const params = (ctx.node.params ?? {}) as Record<string, unknown>;
    const payloads = ctx.getInput("text");
    const textPayload = payloads.find((p): p is TextPayload => p.kind === "text");
    const text = textPayload?.text ?? "";
    const keyParam = typeof params.key === "string" && params.key.trim().length > 0 ? params.key.trim() : null;
    const key = keyParam ?? createHash("sha256").update(text).digest("hex");
    const store = ctx.getNodeState<Map<string, TextPayload>>(() => new Map());
    const cached = store.get(key);
    if (cached) {
      await ctx.recordProgress({ tokens: countTokens(cached.text), latencyMs: 0, status: "ok" });
      return [{ port: "text", payload: clonePayload(cached) }];
    }
    if (textPayload) {
      store.set(key, clonePayload(textPayload) as TextPayload);
      await ctx.recordProgress({ tokens: countTokens(textPayload.text), latencyMs: 0, status: "ok" });
      return [{ port: "text", payload: textPayload }];
    }
    await ctx.recordProgress({ tokens: 0, latencyMs: 0, status: "ok" });
    return [];
  },
};

const logNode: NodeImpl = {
  type: "log",
  label: "Log",
  inputs: [{ port: "any", types: ["text", "json", "vector"] }],
  outputs: [{ port: "any", types: ["text", "json", "vector"] }],
  params: { tag: "" },
  async execute(ctx) {
    const params = (ctx.node.params ?? {}) as Record<string, unknown>;
    const tag = typeof params.tag === "string" && params.tag.trim().length > 0 ? params.tag.trim() : null;
    const payloads = ctx.getInput("any");
    const timestamp = ctx.now();
    await Promise.all(
      payloads.map((payload) => ctx.logEntry({ tag, payload: { payload, timestamp } }))
    );
    await ctx.recordProgress({ tokens: 0, latencyMs: 0, status: "ok" });
    return payloads.map((payload) => ({ port: "any", payload }));
  },
};

const memoryNode: NodeImpl = {
  type: "memory",
  label: "Memory",
  inputs: [{ port: "text", types: ["text"] }],
  outputs: [{ port: "text", types: ["text"] }],
  params: { op: "get", namespace: "default", key: "" },
  async execute(ctx) {
    const params = (ctx.node.params ?? {}) as Record<string, unknown>;
    const namespace = normalizeNamespace(params.namespace);
    const key = typeof params.key === "string" && params.key.trim().length > 0 ? params.key.trim() : null;
    if (!key) {
      throw new Error("Memory node requires a non-empty 'key' parameter.");
    }
    const op = typeof params.op === "string" ? params.op.toLowerCase() : "get";
    const text = ctx.getText("text").join("\n");
    let result = "";
    if (op === "set") {
      await ctx.writeMemory(namespace, key, text);
      result = text;
    } else if (op === "append") {
      result = await ctx.appendMemory(namespace, key, text);
    } else {
      result = (await ctx.readMemory(namespace, key)) ?? "";
    }
    await ctx.recordProgress({ tokens: countTokens(result), latencyMs: 0, status: "ok" });
    return [{ port: "text", payload: { kind: "text", text: result } }];
  },
};

const diverterNode: NodeImpl = {
  type: "diverter",
  label: "Diverter",
  inputs: [{ port: "in", types: ["text", "json"] }],
  outputs: [
    { port: "a", types: ["text", "json"] },
    { port: "b", types: ["text", "json"] },
  ],
  params: { route: "all" },
  async execute(ctx) {
    const params = (ctx.node.params ?? {}) as Record<string, unknown>;
    const routeParam = typeof params.route === "string" ? params.route.toLowerCase() : "all";
    const targets = routeParam === "a" ? ["a"] : routeParam === "b" ? ["b"] : ["a", "b"];
    const payloads = ctx.getInput("in");
    const outputs: NodeExecutionResult = [];
    for (const payload of payloads) {
      for (const target of targets) {
        outputs.push({ port: target, payload: clonePayload(payload) });
      }
    }
    await ctx.recordProgress({ tokens: 0, latencyMs: 0, status: "ok" });
    return outputs;
  },
};

const toolCallNode: NodeImpl = {
  type: "tool.call",
  label: "Tool Call",
  inputs: [{ port: "args", types: ["json", "text"] }],
  outputs: [{ port: "result", types: ["json", "text"] }],
  params: { tool: "" },
  async execute(ctx) {
    const params = (ctx.node.params ?? {}) as Record<string, unknown>;
    const toolName = typeof params.tool === "string" && params.tool.trim().length > 0 ? params.tool.trim() : null;
    if (!toolName) {
      throw new Error("Tool Call node requires a 'tool' parameter.");
    }
    const payloads = ctx.getInput("args");
    const argsSource = payloads.length > 0 ? payloads[payloads.length - 1] : undefined;
    const args = argsSource ? payloadToArgs(argsSource) : ctx.runtimeInput;
    const result = await ctx.invokeTool(toolName, args);
    await ctx.recordProgress({ tokens: 0, latencyMs: 0, status: "ok" });
    if (typeof result === "string") {
      return [{ port: "result", payload: { kind: "text", text: result } }];
    }
    return [{ port: "result", payload: { kind: "json", value: result ?? null } }];
  },
};

const outputNode: NodeImpl = {
  type: "output",
  label: "Output",
  inputs: [{ port: "text", types: ["text"] }],
  outputs: [],
  hidden: true,
  async execute(ctx) {
    const text = ctx.getText("text").join("\n");
    await ctx.logEntry({ tag: "output", payload: { text, timestamp: ctx.now() } });
    await ctx.recordProgress({ tokens: countTokens(text), latencyMs: 0, status: "ok" });
    return [];
  },
};

const BUILTIN_NODES: NodeImpl[] = [
  chatInputNode,
  llmNode,
  promptNode,
  debateLoopNode,
  cacheNode,
  logNode,
  memoryNode,
  diverterNode,
  toolCallNode,
  outputNode,
];

clearAndRegister(BUILTIN_NODES);

const PORT_MIGRATIONS: Record<string, { in?: Record<string, string>; out?: Record<string, string> }> = {
  "chat.input": {
    in: { feedback: "response", Json: "response", response_in: "response" },
    out: { conversation: "text", user_message: "text" },
  },
  prompt: {
    in: { context: "vars", in: "vars" },
    out: { prompt: "text", out: "text" },
  },
  llm: {
    in: { model_input: "prompt" },
    out: { model_output: "text", completion: "text", response: "text" },
  },
  "debate.loop": {
    in: { configurable_in: "text", input: "text", in: "text" },
    out: { configurable_out: "text", body: "text", out: "text", result: "text" },
  },
  cache: {
    in: { lookup: "text", pass_through: "text", save_input: "text", store: "text" },
    out: { cached_output: "text", result: "text", out: "text" },
  },
  log: {
    in: { input: "any", entry: "any" },
    out: {},
  },
  memory: {
    in: { search: "text", write: "text", memory_base: "text", save_data: "text" },
    out: { attach: "text", retrieved_memory: "text", out: "text" },
  },
  diverter: {
    in: { in: "in" },
    out: { and_out: "a", or_out: "b", pathA: "a", pathB: "b" },
  },
  "tool.call": {
    in: { input: "args" },
    out: {},
  },
  output: {
    in: { in: "text" },
    out: {},
  },
};

function upgradeFlow(flow: FlowDef): FlowDef {
  const upgradedNodes = flow.nodes.map((node) => {
    const next: NodeDef = {
      ...node,
      params: { ...(node.params ?? {}) },
    };
    let nextType = node.type;
    const params = next.params as Record<string, unknown>;
    if (nextType === "system.prompt") {
      nextType = "prompt";
      if (typeof params.text === "string" && typeof params.template !== "string") {
        params.template = params.text;
      }
      delete params.text;
    } else if (nextType === "llm.generic") {
      nextType = "llm";
    } else if (nextType === "critic") {
      nextType = "debate.loop";
      if (params.iterations === undefined) {
        params.iterations = 1;
      }
    } else if (nextType === "loop") {
      nextType = "debate.loop";
    } else if (nextType === "orchestrator") {
      nextType = "diverter";
      if (params.route === undefined) {
        params.route = "all";
      }
    } else if (nextType === "retriever" || nextType === "vector.store") {
      nextType = "memory";
      if (params.op === undefined) {
        params.op = "get";
      }
    } else if (nextType === "ui") {
      nextType = "chat.input";
    } else if (nextType === "module") {
      const moduleKey = typeof params.moduleKey === "string" ? params.moduleKey.toLowerCase() : "";
      switch (moduleKey) {
        case "interface":
          nextType = "chat.input";
          break;
        case "prompt":
          nextType = "prompt";
          break;
        case "llm":
          nextType = "llm";
          break;
        case "cache":
          nextType = "cache";
          break;
        case "memory":
          nextType = "memory";
          break;
        case "divider":
        case "diverter":
          nextType = "diverter";
          break;
        case "debate":
        case "loop":
          nextType = "debate.loop";
          break;
        case "log":
          nextType = "log";
          break;
        case "tool":
        case "toolcall":
        case "tool-call":
          nextType = "tool.call";
          break;
        default:
          break;
      }
    }

    next.type = nextType;
    params.moduleKey = nextType;

    const impl = getNode(nextType);
    if (impl) {
      next.in = impl.inputs.map((port) => ({ port: port.port, types: [...port.types] }));
      next.out = impl.outputs.map((port) => ({ port: port.port, types: [...port.types] }));
      if (!next.name || !next.name.trim()) {
        next.name = impl.label;
      }
      if (impl.params) {
        for (const [key, value] of Object.entries(impl.params)) {
          if (!(key in params)) {
            params[key] = value;
          }
        }
      }
    }
    return next;
  });

  const outPortRemap = new Map<string, Record<string, string>>();
  const inPortRemap = new Map<string, Record<string, string>>();

  upgradedNodes.forEach((node) => {
    const migration = PORT_MIGRATIONS[node.type];
    if (migration?.out) {
      outPortRemap.set(node.id, migration.out);
    }
    if (migration?.in) {
      inPortRemap.set(node.id, migration.in);
    }
  });

  const upgradedEdges = flow.edges.map((edge) => {
    const remapped: typeof edge = { ...edge, from: [...edge.from] as [string, string], to: [...edge.to] as [string, string] };
    const outMap = outPortRemap.get(remapped.from[0]);
    if (outMap && outMap[remapped.from[1]]) {
      remapped.from[1] = outMap[remapped.from[1]];
    }
    const inMap = inPortRemap.get(remapped.to[0]);
    if (inMap && inMap[remapped.to[1]]) {
      remapped.to[1] = inMap[remapped.to[1]];
    }
    return remapped;
  });

  return {
    ...flow,
    nodes: upgradedNodes,
    edges: upgradedEdges,
  };
}

function createExecCtx(st: RunState, node: NodeDef): ExecCtx {
  const cachedInputs = collectIncomingPayloads(st, node.id);
  const runtimeInput = st.runtimeInputs?.[node.id];
  return {
    runId: st.runId,
    node,
    runtimeInput,
    now: () => Date.now(),
    getInputs: () => cloneInputsMap(cachedInputs),
    getInput: (port: string) => clonePayloadArray(cachedInputs.get(port) ?? []),
    getText: (port?: string) => {
      const sources = port ? cachedInputs.get(port) ?? [] : Array.from(cachedInputs.values()).flat();
      const texts: string[] = [];
      for (const payload of sources) {
        if (payload.kind === "text" && typeof payload.text === "string") {
          texts.push(payload.text);
        }
      }
      if (texts.length === 0) {
        const runtime = extractRuntimeMessage(runtimeInput);
        if (runtime) {
          texts.push(runtime);
        }
      }
      return texts;
    },
    getNodeState: <T,>(factory: () => T): T => {
      const existing = st.nodeState.get(node.id) as T | undefined;
      if (existing !== undefined) {
        return existing;
      }
      const created = factory();
      st.nodeState.set(node.id, created);
      return created;
    },
    updateNodeState: <T,>(updater: (state: T | undefined) => T | undefined) => {
      const previous = st.nodeState.get(node.id) as T | undefined;
      const next = updater(previous);
      if (next === undefined) {
        st.nodeState.delete(node.id);
      } else {
        st.nodeState.set(node.id, next);
      }
    },
    recordProgress: async ({ tokens, latencyMs, status, message }) => {
      await recordRunLog({
        type: "operation_progress",
        runId: st.runId,
        nodeId: node.id,
        tokens: tokens ?? 0,
        latencyMs: latencyMs ?? 0,
        status: status ?? "ok",
        message,
      } as any);
    },
    logEntry: async ({ tag, payload }) => {
      await insertLogEntry(st.runId, node.id, tag ?? null, {
        payload,
        timestamp: Date.now(),
      });
    },
    readMemory: (namespace, key) => readMemory(normalizeNamespace(namespace), key),
    writeMemory: (namespace, key, value) => writeMemory(normalizeNamespace(namespace), key, value),
    appendMemory: (namespace, key, value) => appendMemory(normalizeNamespace(namespace), key, value),
    invokeTool: (name, args) => invokeTool(name, args, { runId: st.runId, nodeId: node.id }),
  };
}


function nodeById(flow: FlowDef, id: string): NodeDef {
  const n = flow.nodes.find(n => n.id === id);
  if (!n) throw new Error(`node ${id} not found`);
  return n;
}
function portKey(nid: string, port: string) { return `${nid}:${port}`; }

export async function runFlow(flow: FlowDef, inputs: Record<string, unknown> = {}) {
  const upgraded = upgradeFlow(flow);
  const runId = uuidv4();
  const order = topoOrder(upgraded);
  const roots = order.filter((id) => upgraded.edges.every((edge) => edge.to[0] !== id));
  const f0 = new Frontier(roots);
  const runtimeInputs = { ...(upgraded.runtimeInputs ?? {}), ...inputs };
  const st: RunState = {
    runId,
    flow: upgraded,
    frontier: f0,
    halted: false,
    iter: new Map(),
    values: new Map(),
    pktSeq: 0,
    runtimeInputs,
    nodeState: new Map(),
  };
  runs.set(runId, st);
  await createRun(runId, upgraded.id);
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
  return listNodes().map((node) => ({
    type: node.type,
    label: node.label,
    inputs: node.inputs,
    outputs: node.outputs,
    params: { ...(node.params ?? {}) },
  }));
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
      const results = await executeNode(st, node);
      const grouped = new Map<string, PayloadT[]>();
      for (const entry of results) {
        const bucket = grouped.get(entry.port);
        if (bucket) {
          bucket.push(entry.payload);
        } else {
          grouped.set(entry.port, [entry.payload]);
        }
      }
      for (const [port, payloads] of grouped.entries()) {
        st.values.set(portKey(node.id, port), payloads);
        for (const payload of payloads) {
          await savePayload(runId, node.id, port, payload);
        }
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
}
async function executeNode(st: RunState, node: NodeDef): Promise<NodeExecutionResult> {
  const impl = getNode(node.type);
  if (!impl) {
    const allowed = listNodes()
      .map((entry) => entry.type)
      .sort();
    throw new Error(`Unknown node type "${node.type}". Available types: ${allowed.join(", ")}`);
  }
  const ctx = createExecCtx(st, node);
  const started = Date.now();
  try {
    const result = await impl.execute(ctx, node);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ctx.recordProgress({ tokens: 0, latencyMs: Date.now() - started, status: "error", message });
    throw error;
  }
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

