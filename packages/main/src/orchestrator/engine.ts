import Piscina from "piscina";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import type { FlowDef, NodeDef, LLMParams, LoopParams, PayloadT, TextPayload, RuntimeProfile } from "@voide/shared";
import { TelemetryEventType } from "@voide/shared";
import { topoOrder, Frontier, downstream } from "./scheduler.js";
import { getModelRegistry } from "../services/models.js";
import { getSecretsService } from "../services/secrets.js";
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
    // 1. UI module — protobuf input/output
    {
      type: "ui",
      in: [{ port: "response_in", types: ["protobuf"] }],
      out: [{ port: "user_message", types: ["protobuf"] }],
    },

    // 2. LLM module — protobuf input/output
    {
      type: "llm",
      in: [
        {
          port: "model_input",
          types: ["protobuf"],
          description:
            "Receives protobuf message containing prompt and parameters. Module decodes message to JSON internally.",
        },
      ],
      out: [
        {
          port: "model_output",
          types: ["protobuf"],
          description:
            "Outputs protobuf message containing model response. Module encodes JSON/text output back to protobuf.",
        },
      ],
    },

    // 3. Prompt module — protobuf in/out
    {
      type: "prompt",
      in: [{ port: "in", types: ["protobuf"] }],
      out: [{ port: "out", types: ["protobuf"] }],
    },

    // 4. Memory module — two protobuf inputs, one protobuf output
    {
      type: "memory",
      in: [
        { port: "memory_base", types: ["protobuf"] },
        { port: "save_data", types: ["protobuf"] },
      ],
      out: [{ port: "retrieved_memory", types: ["protobuf"] }],
    },

    // 5. Debate module — configurable protobuf ports
    {
      type: "debate",
      in: [{ port: "configurable_in", types: ["protobuf"] }],
      out: [{ port: "configurable_out", types: ["protobuf"] }],
    },

    // 6. Log module — one protobuf input, no output
    {
      type: "log",
      in: [{ port: "input", types: ["protobuf"] }],
      out: [],
    },

    // 7. Cache module — two protobuf inputs, one protobuf output
    {
      type: "cache",
      in: [
        { port: "pass_through", types: ["protobuf"] },
        { port: "save_input", types: ["protobuf"] },
      ],
      out: [{ port: "cached_output", types: ["protobuf"] }],
    },

    // 8. Divider module — one protobuf input, two protobuf outputs (AND/OR gate)
    {
      type: "divider",
      in: [{ port: "in", types: ["protobuf"] }],
      out: [
        { port: "and_out", types: ["protobuf"] },
        { port: "or_out", types: ["protobuf"] },
      ],
    },

    // 9. Loop module — protobuf multi-output structure
    {
      type: "loop",
      in: [{ port: "in", types: ["protobuf"] }],
      out: [
        { port: "body", types: ["protobuf"] },
        { port: "out", types: ["protobuf"] },
      ],
    },
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
    console.info(
      `[orchestrator] Invoking adapter ${mergedParams.adapter} (runtime=${mergedParams.runtime}, maxTokens=${mergedParams.maxTokens}, temperature=${mergedParams.temperature}) for model ${mergedParams.modelId} on node ${node.id}`
    );
    let modelsBase = process.cwd();
    try {
      const { value } = await getSecretsService().get("paths", "modelsDir");
      if (typeof value === "string" && value.trim()) {
        modelsBase = value;
      }
    } catch (error) {
      console.warn("Failed to read models directory secret during execution, using cwd:", error);
    }
    const modelPath = path.resolve(modelsBase, modelFile ?? "");
    const result = await poolLLM.run({
      params: mergedParams,
      prompt,
      modelFile: modelPath,
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
