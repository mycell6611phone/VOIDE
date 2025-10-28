import Piscina from "piscina";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { TelemetryEventType } from "@voide/shared";
import { formatFlowValidationErrors } from "@voide/shared/flowValidation";
import { runLlamaCpp } from "../../../adapters/src/llamaCpp.js";
import { runGpt4All } from "../../../adapters/src/gpt4all.js";
import { runMock } from "../../../adapters/src/mock.js";
import { topoOrder, Frontier, downstream } from "./scheduler.js";
import { clearAndRegister, getNode, listNodes, } from "./nodeRegistry.js";
import { getModelRegistry } from "../services/models.js";
import { getSecretsService } from "../services/secrets.js";
import { recordRunLog, createRun, updateRunStatus, savePayload, getPayloadsForRun, insertLogEntry, readMemory, writeMemory, appendMemory, } from "../services/db.js";
import { emitSchedulerTelemetry, shutdownTelemetry } from "../services/telemetry.js";
import { emitEdgeTransfer, emitNodeError, emitNodeState } from "../ipc/telemetry.js";
import { invokeTool } from "../services/tools.js";
import { validateFlow } from "../services/validate.js";
const runs = new Map();
const loopTasks = new Map();
function createAbortError(message, reason) {
    if (reason instanceof Error) {
        return reason;
    }
    const error = new Error(message);
    error.name = "AbortError";
    return error;
}
function isAbortError(error) {
    if (!error) {
        return false;
    }
    if (error instanceof Error && error.name === "AbortError") {
        return true;
    }
    if (typeof error === "object" && "name" in error) {
        return error.name === "AbortError";
    }
    if (typeof error === "object" && "code" in error) {
        return error.code === "ABORT_ERR";
    }
    return false;
}
function throwIfAborted(signal, message = "Run cancelled.") {
    if (signal.aborted) {
        throw createAbortError(message, signal.reason);
    }
}
function abortablePromise(signal, promise, message) {
    if (!signal.aborted) {
        return new Promise((resolve, reject) => {
            const cleanup = () => signal.removeEventListener("abort", onAbort);
            const onAbort = () => {
                cleanup();
                reject(createAbortError(message ?? "Run cancelled.", signal.reason));
            };
            signal.addEventListener("abort", onAbort, { once: true });
            promise.then((value) => {
                cleanup();
                resolve(value);
            }, (error) => {
                cleanup();
                reject(error);
            });
        });
    }
    return Promise.reject(createAbortError(message ?? "Run cancelled.", signal.reason));
}
function setNodeStatus(st, nodeId, status) {
    const previous = st.nodeStatus.get(nodeId);
    if (previous === status) {
        return;
    }
    st.nodeStatus.set(nodeId, status);
    emitNodeState(st.runId, nodeId, status);
}
function markNodeStopped(st, nodeId) {
    const status = st.nodeStatus.get(nodeId);
    if (!status || status === "running" || status === "queued") {
        setNodeStatus(st, nodeId, "stopped");
    }
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PiscinaCtor = Piscina;
const LLM_WORKER_SPECIFIER_CANDIDATES = [
    "@voide/workers/dist/llm.js",
    "@voide/workers/llm.js",
    "@voide/workers/src/llm.js",
];
const LLM_WORKER_RELATIVE_CANDIDATES = [
    "../../../workers/dist/llm.js",
    "../../../workers/dist/src/llm.js",
    "../../../workers/src/llm.js",
];
let poolLLM = null;
let llmWorkerMissingLogged = false;
let llmFallbackLogged = false;
function resolveLLMWorkerEntry() {
    for (const specifier of LLM_WORKER_SPECIFIER_CANDIDATES) {
        const resolved = resolveLLMWorkerFromSpecifier(specifier);
        if (resolved) {
            return resolved;
        }
    }
    for (const relative of LLM_WORKER_RELATIVE_CANDIDATES) {
        const candidate = path.resolve(__dirname, relative);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}
function resolveLLMWorkerFromSpecifier(specifier) {
    const meta = import.meta;
    const resolver = meta.resolve;
    if (typeof resolver !== "function") {
        return null;
    }
    let resolved;
    try {
        resolved = resolver(specifier, import.meta.url);
    }
    catch (error) {
        if (!isModuleResolutionError(error)) {
            console.warn(`[orchestrator] Unexpected error while resolving LLM worker specifier "${specifier}":`, error);
        }
        return null;
    }
    if (!resolved) {
        return null;
    }
    if (resolved.startsWith("node:")) {
        return null;
    }
    const candidate = resolved.startsWith("file:") ? fileURLToPath(resolved) : resolved;
    if (!fs.existsSync(candidate)) {
        return null;
    }
    return candidate;
}
function ensureLLMPool() {
    if (poolLLM) {
        return poolLLM;
    }
    const workerEntry = resolveLLMWorkerEntry();
    if (!workerEntry) {
        if (!llmWorkerMissingLogged) {
            console.warn("[orchestrator] LLM worker bundle not found. Falling back to in-process execution. Run `pnpm --filter @voide/workers build` to enable threaded LLMs.");
            llmWorkerMissingLogged = true;
        }
        return null;
    }
    try {
        poolLLM = new PiscinaCtor({ filename: workerEntry });
        return poolLLM;
    }
    catch (error) {
        console.error("[orchestrator] Failed to initialize LLM worker:", error);
        return null;
    }
}
async function runLLMWithFallback(job, signal) {
    throwIfAborted(signal);
    const pool = ensureLLMPool();
    if (pool) {
        try {
            return await pool.run(job, { signal });
        }
        catch (error) {
            if (isAbortError(error)) {
                throw error;
            }
            console.error("[orchestrator] LLM worker execution failed, retrying in-process:", error);
            poolLLM = null;
        }
    }
    return runLLMInline(job, signal);
}
async function runLLMInline(job, signal) {
    throwIfAborted(signal);
    const start = Date.now();
    const adapter = job.params.adapter ?? DEFAULT_ADAPTER;
    if (!llmFallbackLogged && adapter !== "mock") {
        console.warn(`[orchestrator] Adapter "${adapter}" requested without worker bundle; executing inline. Build @voide/workers for threaded runs.`);
        llmFallbackLogged = true;
    }
    const prompt = job.prompt ?? "";
    let text;
    try {
        switch (adapter) {
            case "mock": {
                text = await runMock(prompt);
                break;
            }
            case "gpt4all": {
                throwIfAborted(signal);
                text = await runGpt4All({
                    modelFile: job.modelFile,
                    prompt,
                    maxTokens: job.params.maxTokens,
                    temperature: job.params.temperature,
                });
                break;
            }
            case "llama.cpp": {
                throwIfAborted(signal);
                text = await runLlamaCpp({
                    modelFile: job.modelFile,
                    prompt,
                    maxTokens: job.params.maxTokens,
                    temperature: job.params.temperature,
                    runtime: job.params.runtime ?? DEFAULT_RUNTIME,
                    signal,
                });
                break;
            }
            default: {
                throw new Error(`Unknown adapter "${adapter}" requested.`);
            }
        }
    }
    catch (error) {
        if (isAbortError(error)) {
            throw error;
        }
        throw toAdapterError(adapter, error);
    }
    throwIfAborted(signal);
    return {
        text,
        tokens: countTokens(text),
        latencyMs: Date.now() - start,
    };
}
function isModuleResolutionError(error) {
    if (!error || typeof error !== "object") {
        return false;
    }
    const code = error.code;
    return code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND";
}
function isMissingBinaryError(error) {
    if (!error || typeof error !== "object") {
        return false;
    }
    const code = error.code;
    return code === "ENOENT";
}
function toAdapterError(adapter, error) {
    const cause = error instanceof Error ? error : undefined;
    if (adapter === "llama.cpp" && isMissingBinaryError(error)) {
        return new Error("Failed to launch the llama.cpp backend. Ensure the `llama-cli` binary is installed and reachable via PATH or configure the LLAMA_BIN environment variable.", cause ? { cause } : undefined);
    }
    if (adapter === "gpt4all" && isModuleResolutionError(error)) {
        return new Error("The gpt4all adapter is not available. Install the optional `gpt4all` dependency in the workspace or switch the node to use the llama.cpp adapter.", cause ? { cause } : undefined);
    }
    const message = cause ? cause.message : String(error);
    return new Error(`LLM adapter "${adapter}" failed to execute: ${message}`, cause ? { cause } : undefined);
}
const fsPromises = fs.promises;
const MODEL_MANIFEST_SEARCH_PATHS = [
    path.resolve(__dirname, "../../../../models/models.json"),
    path.resolve(process.cwd(), "models/models.json"),
];
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_RUNTIME = "CPU";
const DEFAULT_ADAPTER = "llama.cpp";
const TYPE_ADAPTER_OVERRIDES = {
    falcon: "gpt4all",
    mpt: "gpt4all",
    replit: "gpt4all",
    bert: "gpt4all",
};
const TYPE_TEMPERATURE_OVERRIDES = {
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
let manifestModelsCache = null;
function homeDir() {
    return process.env.HOME || process.env.USERPROFILE || ".";
}
async function loadManifestModels() {
    if (manifestModelsCache) {
        return manifestModelsCache;
    }
    for (const candidate of MODEL_MANIFEST_SEARCH_PATHS) {
        try {
            const raw = await fsPromises.readFile(candidate, "utf-8");
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                manifestModelsCache = parsed;
                return manifestModelsCache;
            }
        }
        catch (error) {
            // ignore and continue to next candidate
        }
    }
    manifestModelsCache = [];
    return manifestModelsCache;
}
function normalizeKey(value) {
    if (!value || typeof value !== "string")
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    return trimmed.toLowerCase();
}
function addNormalizedVariants(target, value) {
    if (!value || typeof value !== "string")
        return;
    const normalized = normalizeKey(value);
    if (!normalized)
        return;
    target.add(normalized);
    const compact = normalized.replace(/[^a-z0-9]+/g, "");
    if (compact)
        target.add(compact);
}
function stripModelPrefix(value) {
    return value.replace(/^model:/i, "");
}
function sanitizeModelId(raw) {
    if (!raw || typeof raw !== "string")
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    const sanitized = trimmed.replace(/\s+/g, "-").toLowerCase();
    if (!sanitized)
        return null;
    return sanitized.startsWith("model:") ? sanitized : `model:${sanitized}`;
}
function manifestIdCandidates(entry) {
    const out = new Set();
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
function manifestNameCandidates(entry) {
    const out = new Set();
    addNormalizedVariants(out, entry.name);
    return Array.from(out);
}
function gatherParamCandidates(rawParams) {
    const idCandidates = new Set();
    const nameCandidates = new Set();
    const addId = (value) => {
        if (typeof value !== "string")
            return;
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
    const addName = (value) => {
        if (typeof value !== "string")
            return;
        addNormalizedVariants(nameCandidates, value);
    };
    addId(rawParams.modelId);
    addId(rawParams.model_id);
    addName(rawParams.modelName);
    addName(rawParams.modelLabel);
    addName(rawParams.displayName);
    addName(rawParams.title);
    addName(rawParams.label);
    if (typeof rawParams.model === "string") {
        addId(rawParams.model);
        addName(rawParams.model);
    }
    else if (rawParams.model && typeof rawParams.model === "object") {
        const modelRecord = rawParams.model;
        addId(modelRecord.id);
        addId(modelRecord.modelId);
        addId(modelRecord.model_id);
        addName(modelRecord.name);
        addName(modelRecord.label);
        addName(modelRecord.title);
    }
    return { idCandidates, nameCandidates };
}
function normalizeAdapter(value) {
    if (typeof value !== "string")
        return undefined;
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
function normalizeRuntime(value) {
    if (typeof value !== "string")
        return undefined;
    const normalized = value.trim().toUpperCase();
    if (normalized === "GPU")
        return "CUDA";
    if (normalized === "CUDA" || normalized === "CPU")
        return normalized;
    return undefined;
}
function extractRegistryDefaults(registryModel) {
    const defaults = {};
    if (!registryModel) {
        return defaults;
    }
    const queue = [
        registryModel.defaults,
        registryModel.defaultConfig,
        registryModel.params,
        registryModel.config,
        registryModel,
    ];
    const seen = new Set();
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== "object") {
            continue;
        }
        if (seen.has(current)) {
            continue;
        }
        seen.add(current);
        const source = current;
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
function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return undefined;
}
function toPositiveInt(value) {
    const num = toNumber(value);
    if (num === undefined)
        return undefined;
    const rounded = Math.floor(num);
    return rounded > 0 ? rounded : undefined;
}
async function fileExists(p) {
    try {
        await fsPromises.access(p);
        return true;
    }
    catch {
        return false;
    }
}
function firstNonEmptyString(values) {
    for (const value of values) {
        if (!value)
            continue;
        const trimmed = value.trim();
        if (trimmed)
            return trimmed;
    }
    return null;
}
async function resolveModelFilePath(registryModel, manifestModel, adapter) {
    const secrets = getSecretsService();
    let baseDir = path.join(homeDir(), ".voide", "models");
    try {
        const { value } = await secrets.get("paths", "modelsDir");
        if (typeof value === "string" && value.trim()) {
            baseDir = path.resolve(value);
        }
    }
    catch (error) {
        console.warn("Failed to read models directory secret, falling back to default:", error);
    }
    const candidates = [];
    if (registryModel?.file && typeof registryModel.file === "string" && registryModel.file.trim()) {
        candidates.push(path.resolve(registryModel.file));
    }
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
            if (!id)
                continue;
            candidates.push(path.join(baseDir, id, manifestModel.filename));
            const stripped = stripModelPrefix(id);
            if (stripped !== id) {
                candidates.push(path.join(baseDir, stripped, manifestModel.filename));
            }
        }
    }
    const seen = new Set();
    for (const candidate of candidates) {
        const resolved = path.resolve(candidate);
        if (seen.has(resolved))
            continue;
        seen.add(resolved);
        if (await fileExists(resolved)) {
            return resolved;
        }
    }
    const modelName = manifestModel?.name ?? registryModel?.name ?? "selected model";
    throw new Error(`Model file for "${modelName}" not found. Install the model before running this node.`);
}
async function resolveLLMJobConfig(rawParams) {
    const manifestModels = await loadManifestModels();
    const { idCandidates, nameCandidates } = gatherParamCandidates(rawParams);
    const manifestModel = manifestModels.find((entry) => {
        const ids = manifestIdCandidates(entry);
        const names = manifestNameCandidates(entry);
        return (ids.some(id => idCandidates.has(id)) ||
            names.some(name => idCandidates.has(name) || nameCandidates.has(name)));
    }) ?? null;
    const registry = await getModelRegistry();
    const combinedIdCandidates = new Set(idCandidates);
    const combinedNameCandidates = new Set(nameCandidates);
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
    const registryModel = registry.models.find((entry) => {
        const values = new Set();
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
        rawParams.modelId,
        rawParams.model_id,
        rawParams.modelName,
        rawParams.modelLabel,
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
        throw new Error(`The mock adapter for model "${modelLabel}" has been disabled. Choose a llama.cpp or gpt4all configuration instead.`);
    }
    if (!finalAdapter) {
        throw new Error(`No adapter configured for model "${modelLabel}".`);
    }
    const paramRuntime = normalizeRuntime(rawParams.runtime);
    const manifestRuntime = normalizeRuntime(manifestModel?.runtime);
    const finalRuntime = paramRuntime ?? registryDefaults.runtime ?? manifestRuntime ?? DEFAULT_RUNTIME;
    const reasonerOverride = (manifestModel?.name ?? registryModel.name ?? "").toLowerCase().includes("reasoner v1");
    const manifestTemperature = toNumber(manifestModel?.temperature);
    const finalTemperature = toNumber(rawParams.temperature) ??
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
    let finalMaxTokens = toPositiveInt(rawParams.maxTokens) ??
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
        rawParams.modelId,
        rawParams.model_id,
        registryModel.id,
        sanitizeModelId(registryModel.id) ?? undefined,
        sanitizeModelId(manifestModel?.filename ?? manifestModel?.name ?? manifestModel?.order ?? undefined) ?? undefined,
    ]);
    if (!resolvedModelId) {
        throw new Error(`Unable to determine model id for "${modelLabel}".`);
    }
    const modelFile = await resolveModelFilePath(registryModel, manifestModel, finalAdapter);
    const params = {
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
function clonePayload(payload) {
    try {
        return typeof structuredClone === "function" ? structuredClone(payload) : JSON.parse(JSON.stringify(payload));
    }
    catch {
        return JSON.parse(JSON.stringify(payload));
    }
}
function clonePayloadArray(payloads) {
    return payloads.map(clonePayload);
}
function cloneInputsMap(map) {
    const out = new Map();
    for (const [port, payloads] of map.entries()) {
        out.set(port, clonePayloadArray(payloads));
    }
    return out;
}
function collectIncomingPayloads(st, nodeId) {
    const map = new Map();
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
        }
        else {
            map.set(edge.to[1], payloads.map(clonePayload));
        }
    }
    return map;
}
function countTokens(text) {
    const trimmed = typeof text === "string" ? text.trim() : "";
    if (!trimmed) {
        return 0;
    }
    return trimmed.split(/\s+/).length;
}
function normalizeNamespace(value) {
    if (typeof value !== "string") {
        return "default";
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "default";
}
function extractRuntimeMessage(value) {
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
        const record = value;
        const candidateKeys = ["message", "text", "content", "value"];
        for (const key of candidateKeys) {
            const raw = record[key];
            if (typeof raw === "string" && raw.trim().length > 0) {
                return raw;
            }
        }
        try {
            return JSON.stringify(value);
        }
        catch {
            return String(value);
        }
    }
    return null;
}
function renderTemplate(template, vars) {
    const tpl = typeof template === "string" ? template : "";
    if (!tpl.trim()) {
        const direct = vars.input;
        return typeof direct === "string" ? direct : "";
    }
    return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
        const path = key.split(".");
        let current = vars;
        for (const segment of path) {
            if (!current || typeof current !== "object") {
                current = undefined;
                break;
            }
            current = current[segment];
        }
        if (current === undefined || current === null) {
            return "";
        }
        return String(current);
    });
}
function payloadToArgs(payload) {
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
        }
        catch {
            return text;
        }
    }
    return payload;
}
const chatInputNode = {
    type: "chat.input",
    label: "ChatInput",
    inputs: [{ port: "response", types: ["text", "json"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { message: "" },
    async execute(ctx) {
        const params = (ctx.node.params ?? {});
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
const promptNode = {
    type: "prompt",
    label: "Prompt",
    inputs: [{ port: "vars", types: ["json", "text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { template: "" },
    async execute(ctx) {
        const payloads = ctx.getInput("vars");
        const vars = {};
        for (const payload of payloads) {
            if (payload.kind === "json" && payload.value && typeof payload.value === "object") {
                Object.assign(vars, payload.value);
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
        const params = (ctx.node.params ?? {});
        const template = typeof params.template === "string" ? params.template : "";
        const rendered = renderTemplate(template, vars);
        await ctx.recordProgress({ tokens: countTokens(rendered), latencyMs: 0, status: "ok" });
        return [{ port: "text", payload: { kind: "text", text: rendered } }];
    },
};
const llmNode = {
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
        ctx.throwIfCancelled();
        const result = await runLLMWithFallback({ params, prompt, modelFile }, ctx.abortSignal);
        const payload = { kind: "text", text: result.text };
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
const debateLoopNode = {
    type: "debate.loop",
    label: "Debate/Loop",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { iterations: 2, reducer: "last" },
    async execute(ctx) {
        const params = (ctx.node.params ?? {});
        const iterations = Math.max(1, toPositiveInt(params.iterations) ?? 2);
        const reducer = typeof params.reducer === "string" ? params.reducer.toLowerCase() : "last";
        const input = ctx.getText("text").join("\n");
        const rounds = [];
        for (let i = 0; i < iterations; i += 1) {
            const prefix = iterations > 1 ? `Round ${i + 1}: ` : "";
            rounds.push(`${prefix}${input}`.trim());
        }
        const output = reducer === "concat" ? rounds.join("\n\n") : rounds[rounds.length - 1] ?? input;
        await ctx.recordProgress({ tokens: countTokens(output), latencyMs: 0, status: "ok" });
        return [{ port: "text", payload: { kind: "text", text: output } }];
    },
};
const cacheNode = {
    type: "cache",
    label: "Cache",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { strategy: "read-through", key: "" },
    async execute(ctx) {
        const params = (ctx.node.params ?? {});
        const payloads = ctx.getInput("text");
        const textPayload = payloads.find((p) => p.kind === "text");
        const text = textPayload?.text ?? "";
        const keyParam = typeof params.key === "string" && params.key.trim().length > 0 ? params.key.trim() : null;
        const key = keyParam ?? createHash("sha256").update(text).digest("hex");
        const store = ctx.getNodeState(() => new Map());
        const cached = store.get(key);
        if (cached) {
            await ctx.recordProgress({ tokens: countTokens(cached.text), latencyMs: 0, status: "ok" });
            return [{ port: "text", payload: clonePayload(cached) }];
        }
        if (textPayload) {
            store.set(key, clonePayload(textPayload));
            await ctx.recordProgress({ tokens: countTokens(textPayload.text), latencyMs: 0, status: "ok" });
            return [{ port: "text", payload: textPayload }];
        }
        await ctx.recordProgress({ tokens: 0, latencyMs: 0, status: "ok" });
        return [];
    },
};
const logNode = {
    type: "log",
    label: "Log",
    inputs: [{ port: "any", types: ["text", "json", "vector"] }],
    outputs: [{ port: "any", types: ["text", "json", "vector"] }],
    params: { tag: "" },
    async execute(ctx) {
        const params = (ctx.node.params ?? {});
        const tag = typeof params.tag === "string" && params.tag.trim().length > 0 ? params.tag.trim() : null;
        const payloads = ctx.getInput("any");
        const timestamp = ctx.now();
        await Promise.all(payloads.map((payload) => ctx.logEntry({ tag, payload: { payload, timestamp } })));
        await ctx.recordProgress({ tokens: 0, latencyMs: 0, status: "ok" });
        return payloads.map((payload) => ({ port: "any", payload }));
    },
};
const memoryNode = {
    type: "memory",
    label: "Memory",
    inputs: [{ port: "text", types: ["text"] }],
    outputs: [{ port: "text", types: ["text"] }],
    params: { op: "get", namespace: "default", key: "" },
    async execute(ctx) {
        const params = (ctx.node.params ?? {});
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
        }
        else if (op === "append") {
            result = await ctx.appendMemory(namespace, key, text);
        }
        else {
            result = (await ctx.readMemory(namespace, key)) ?? "";
        }
        await ctx.recordProgress({ tokens: countTokens(result), latencyMs: 0, status: "ok" });
        return [{ port: "text", payload: { kind: "text", text: result } }];
    },
};
const diverterNode = {
    type: "diverter",
    label: "Diverter",
    inputs: [{ port: "in", types: ["text", "json"] }],
    outputs: [
        { port: "a", types: ["text", "json"] },
        { port: "b", types: ["text", "json"] },
    ],
    params: { route: "all" },
    async execute(ctx) {
        const params = (ctx.node.params ?? {});
        const routeParam = typeof params.route === "string" ? params.route.toLowerCase() : "all";
        const targets = routeParam === "a" ? ["a"] : routeParam === "b" ? ["b"] : ["a", "b"];
        const payloads = ctx.getInput("in");
        const outputs = [];
        for (const payload of payloads) {
            for (const target of targets) {
                outputs.push({ port: target, payload: clonePayload(payload) });
            }
        }
        await ctx.recordProgress({ tokens: 0, latencyMs: 0, status: "ok" });
        return outputs;
    },
};
const toolCallNode = {
    type: "tool.call",
    label: "Tool Call",
    inputs: [{ port: "args", types: ["json", "text"] }],
    outputs: [{ port: "result", types: ["json", "text"] }],
    params: { tool: "" },
    async execute(ctx) {
        const params = (ctx.node.params ?? {});
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
const outputNode = {
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
const BUILTIN_NODES = [
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
const PORT_MIGRATIONS = {
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
function upgradeFlow(flow) {
    const upgradedNodes = flow.nodes.map((node) => {
        const next = {
            ...node,
            params: { ...(node.params ?? {}) },
        };
        let nextType = node.type;
        const params = next.params;
        if (nextType === "system.prompt") {
            nextType = "prompt";
            if (typeof params.text === "string" && typeof params.template !== "string") {
                params.template = params.text;
            }
            delete params.text;
        }
        else if (nextType === "critic") {
            nextType = "debate.loop";
            if (params.iterations === undefined) {
                params.iterations = 1;
            }
        }
        else if (nextType === "loop") {
            nextType = "debate.loop";
        }
        else if (nextType === "orchestrator") {
            nextType = "diverter";
            if (params.route === undefined) {
                params.route = "all";
            }
        }
        else if (nextType === "retriever" || nextType === "vector.store") {
            nextType = "memory";
            if (params.op === undefined) {
                params.op = "get";
            }
        }
        else if (nextType === "ui") {
            nextType = "chat.input";
        }
        else if (nextType === "module") {
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
    const outPortRemap = new Map();
    const inPortRemap = new Map();
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
        const remapped = { ...edge, from: [...edge.from], to: [...edge.to] };
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
function createExecCtx(st, node) {
    const cachedInputs = collectIncomingPayloads(st, node.id);
    const runtimeInput = st.runtimeInputs?.[node.id];
    return {
        runId: st.runId,
        node,
        runtimeInput,
        abortSignal: st.abortController.signal,
        now: () => Date.now(),
        getInputs: () => cloneInputsMap(cachedInputs),
        getInput: (port) => clonePayloadArray(cachedInputs.get(port) ?? []),
        getText: (port) => {
            const sources = port ? cachedInputs.get(port) ?? [] : Array.from(cachedInputs.values()).flat();
            const texts = [];
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
        getNodeState: (factory) => {
            const existing = st.nodeState.get(node.id);
            if (existing !== undefined) {
                return existing;
            }
            const created = factory();
            st.nodeState.set(node.id, created);
            return created;
        },
        updateNodeState: (updater) => {
            const previous = st.nodeState.get(node.id);
            const next = updater(previous);
            if (next === undefined) {
                st.nodeState.delete(node.id);
            }
            else {
                st.nodeState.set(node.id, next);
            }
        },
        isCancelled: () => st.abortController.signal.aborted,
        throwIfCancelled: () => throwIfAborted(st.abortController.signal),
        recordProgress: async ({ tokens, latencyMs, status, message }) => {
            await recordRunLog({
                type: "operation_progress",
                runId: st.runId,
                nodeId: node.id,
                tokens: tokens ?? 0,
                latencyMs: latencyMs ?? 0,
                status: status ?? "ok",
                message,
            });
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
        invokeTool: (name, args) => invokeTool(name, args, { runId: st.runId, nodeId: node.id }, st.abortController.signal),
    };
}
function nodeById(flow, id) {
    const n = flow.nodes.find(n => n.id === id);
    if (!n)
        throw new Error(`node ${id} not found`);
    return n;
}
function portKey(nid, port) { return `${nid}:${port}`; }
function isInterfaceNode(node) {
    const type = typeof node.type === "string" ? node.type.toLowerCase() : "";
    if (type === "chat.input" || type === "interface" || type === "ui.interface") {
        return true;
    }
    if (type === "module") {
        const moduleKeyRaw = node.params?.moduleKey;
        if (typeof moduleKeyRaw === "string") {
            const normalized = moduleKeyRaw.toLowerCase();
            if (normalized === "interface" || normalized === "chat.input") {
                return true;
            }
        }
    }
    return false;
}
function collectInterfaceNodes(flow) {
    return flow.nodes.filter(isInterfaceNode).map((node) => node.id);
}
export async function runFlow(flow, inputs = {}) {
    const validation = validateFlow(flow);
    if (!validation.ok) {
        const message = formatFlowValidationErrors(validation.errors).join("\n") ||
            "Flow validation failed.";
        throw new Error(message);
    }
    const upgraded = upgradeFlow(flow);
    const interfaceNodes = collectInterfaceNodes(upgraded);
    const runId = uuidv4();
    const order = topoOrder(upgraded);
    const roots = order.filter((id) => upgraded.edges.every((edge) => edge.to[0] !== id));
    const f0 = new Frontier(roots);
    const normalizedInputs = { ...(inputs ?? {}) };
    const userInputValue = normalizedInputs["userInput"];
    if (Object.prototype.hasOwnProperty.call(normalizedInputs, "userInput")) {
        delete normalizedInputs["userInput"];
    }
    const runtimeInputs = { ...(upgraded.runtimeInputs ?? {}), ...normalizedInputs };
    const userInputText = typeof userInputValue === "string" ? userInputValue : "";
    if (userInputText.trim().length > 0 && interfaceNodes.length > 0) {
        for (const nodeId of interfaceNodes) {
            runtimeInputs[nodeId] = userInputText;
        }
    }
    const st = {
        runId,
        flow: upgraded,
        frontier: f0,
        halted: false,
        iter: new Map(),
        values: new Map(),
        pktSeq: 0,
        runtimeInputs,
        input: userInputText,
        nodeState: new Map(),
        nodeStatus: new Map(),
        abortController: new AbortController(),
        activeNodeId: null,
    };
    runs.set(runId, st);
    roots.forEach((nodeId) => setNodeStatus(st, nodeId, "queued"));
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
    await loopPromise;
    return { runId };
}
export async function stopFlow(runId) {
    const st = runs.get(runId);
    if (st) {
        if (!st.halted) {
            st.halted = true;
            if (!st.abortController.signal.aborted) {
                st.abortController.abort(createAbortError(`Run ${runId} stopped.`));
            }
            updateRunStatus(runId, "stopped");
            if (st.activeNodeId) {
                markNodeStopped(st, st.activeNodeId);
            }
            for (const nodeId of st.frontier.snapshot()) {
                markNodeStopped(st, nodeId);
            }
            st.frontier.clear();
        }
    }
    const task = loopTasks.get(runId);
    if (task) {
        try {
            await task;
        }
        catch (error) {
            if (!isAbortError(error)) {
                console.warn(`[orchestrator] stopFlow awaiting loop failed:`, error);
            }
        }
    }
    return { ok: true };
}
export async function stepFlow(_runId) { return { ok: true }; }
export async function getLastRunPayloads(runId) {
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
const cloneNodeDef = (node) => {
    try {
        return typeof structuredClone === "function"
            ? structuredClone(node)
            : JSON.parse(JSON.stringify(node));
    }
    catch {
        return JSON.parse(JSON.stringify(node));
    }
};
const buildTesterInputMap = (entries) => {
    const map = new Map();
    for (const entry of entries) {
        if (!entry || typeof entry.port !== "string") {
            continue;
        }
        const port = entry.port;
        const payload = clonePayload(entry.payload);
        const existing = map.get(port);
        if (existing) {
            existing.push(payload);
        }
        else {
            map.set(port, [payload]);
        }
    }
    return map;
};
export async function testNode(node, inputs = []) {
    const impl = getNode(node.type ?? "");
    if (!impl) {
        const available = listNodes()
            .map((entry) => entry.type)
            .sort();
        return {
            ok: false,
            error: `Unknown node type "${node.type}". Available types: ${available.join(", ")}`,
            progress: [],
            logs: []
        };
    }
    const runId = `module-test:${node.id ?? node.type}:${Date.now().toString(36)}`;
    const abortController = new AbortController();
    const payloadMap = buildTesterInputMap(inputs);
    const nodeState = new Map();
    const progress = [];
    const logs = [];
    const nodeClone = cloneNodeDef(node);
    const ctx = {
        runId,
        node: nodeClone,
        runtimeInput: undefined,
        abortSignal: abortController.signal,
        now: () => Date.now(),
        getInputs: () => cloneInputsMap(payloadMap),
        getInput: (port) => clonePayloadArray(payloadMap.get(port) ?? []),
        getText: (port) => {
            const sources = port
                ? payloadMap.get(port) ?? []
                : Array.from(payloadMap.values()).flat();
            const texts = [];
            for (const payload of sources) {
                if (payload.kind === "text" && typeof payload.text === "string") {
                    texts.push(payload.text);
                }
            }
            return texts;
        },
        getNodeState: (factory) => {
            const existing = nodeState.get(nodeClone.id);
            if (existing !== undefined) {
                return existing;
            }
            const created = factory();
            nodeState.set(nodeClone.id, created);
            return created;
        },
        updateNodeState: (updater) => {
            const previous = nodeState.get(nodeClone.id);
            const next = updater(previous);
            if (next === undefined) {
                nodeState.delete(nodeClone.id);
            }
            else {
                nodeState.set(nodeClone.id, next);
            }
        },
        isCancelled: () => abortController.signal.aborted,
        throwIfCancelled: () => throwIfAborted(abortController.signal),
        recordProgress: async ({ tokens, latencyMs, status, message }) => {
            progress.push({
                tokens,
                latencyMs,
                status,
                message,
                at: Date.now()
            });
        },
        logEntry: async ({ tag, payload }) => {
            logs.push({ tag: tag ?? null, payload });
        },
        readMemory,
        writeMemory,
        appendMemory,
        invokeTool: (name, args) => invokeTool(name, args, { runId, nodeId: nodeClone.id }, abortController.signal)
    };
    try {
        const outputs = await impl.execute(ctx, nodeClone);
        const normalized = Array.isArray(outputs)
            ? outputs.map((entry) => ({
                port: entry.port,
                payload: clonePayload(entry.payload)
            }))
            : [];
        return {
            ok: true,
            outputs: normalized,
            progress,
            logs
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            error: message,
            progress,
            logs
        };
    }
}
async function loop(runId) {
    const st = runs.get(runId);
    while (!st.halted && st.frontier.hasReady()) {
        const nodeId = st.frontier.nextReady();
        const node = nodeById(st.flow, nodeId);
        st.activeNodeId = node.id;
        setNodeStatus(st, node.id, "running");
        emitSchedulerTelemetry({
            type: TelemetryEventType.NodeStart,
            payload: { id: node.id, span: st.runId },
        });
        try {
            const results = await executeNode(st, node);
            const grouped = new Map();
            for (const entry of results) {
                const bucket = grouped.get(entry.port);
                if (bucket) {
                    bucket.push(entry.payload);
                }
                else {
                    grouped.set(entry.port, [entry.payload]);
                }
            }
            for (const [port, payloads] of grouped.entries()) {
                st.values.set(portKey(node.id, port), payloads);
                for (const payload of payloads) {
                    await savePayload(runId, node.id, port, payload);
                }
                emitWireTransfers(st, node, port, payloads);
            }
            if (!st.halted && !st.abortController.signal.aborted) {
                downstream(st.flow, node.id).forEach((n) => {
                    st.frontier.add(n);
                    setNodeStatus(st, n, "queued");
                });
            }
            emitSchedulerTelemetry({
                type: TelemetryEventType.NodeEnd,
                payload: { id: node.id, span: st.runId, ok: true },
            });
            emitSchedulerTelemetry({
                type: TelemetryEventType.AckClear,
                payload: { id: node.id, span: st.runId },
            });
            setNodeStatus(st, node.id, "ok");
        }
        catch (err) {
            if (isAbortError(err) || st.abortController.signal.aborted || st.halted) {
                emitSchedulerTelemetry({
                    type: TelemetryEventType.NodeEnd,
                    payload: { id: node.id, span: st.runId, ok: false, reason: "aborted" },
                });
                emitSchedulerTelemetry({
                    type: TelemetryEventType.AckClear,
                    payload: { id: node.id, span: st.runId },
                });
                markNodeStopped(st, node.id);
                break;
            }
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
            setNodeStatus(st, node.id, "error");
            emitNodeError(st.runId, node.id, reason);
        }
        finally {
            st.activeNodeId = null;
        }
    }
    if (!st.halted)
        updateRunStatus(runId, "done");
}
let shutdownPromise = null;
export async function shutdownOrchestrator() {
    if (shutdownPromise) {
        return shutdownPromise;
    }
    shutdownPromise = (async () => {
        try {
            const runIds = Array.from(new Set([...runs.keys(), ...loopTasks.keys()]));
            if (runIds.length > 0) {
                await Promise.all(runIds.map((runId) => stopFlow(runId)));
            }
            const pending = Array.from(loopTasks.values());
            if (pending.length > 0) {
                await Promise.allSettled(pending);
            }
            const pool = poolLLM;
            poolLLM = null;
            if (pool) {
                try {
                    await pool.destroy();
                }
                catch (error) {
                    console.warn("[orchestrator] Failed to destroy LLM worker pool:", error);
                }
            }
        }
        finally {
            shutdownTelemetry();
        }
    })();
    shutdownPromise.catch((error) => {
        console.error("[orchestrator] Shutdown encountered an error:", error);
    });
    return shutdownPromise;
}
async function executeNode(st, node) {
    const nodeType = typeof node.type === "string" ? node.type.toLowerCase() : "";
    if (nodeType === "ui.interface") {
        const text = typeof st.input === "string" ? st.input : "";
        return [{ port: "out", payload: { kind: "text", text } }];
    }
    if (nodeType === "llm.generic") {
        const incoming = collectIncomingPayloads(st, node.id);
        const parts = [];
        for (const payloads of incoming.values()) {
            for (const payload of payloads) {
                if (payload.kind === "text" && typeof payload.text === "string") {
                    parts.push(payload.text);
                }
            }
        }
        if (parts.length === 0 && typeof st.input === "string" && st.input.trim().length > 0) {
            parts.push(st.input);
        }
        const prompt = parts.join("\n");
        throwIfAborted(st.abortController.signal);
        const response = await runModel(prompt, st.abortController.signal);
        throwIfAborted(st.abortController.signal);
        return [{ port: "out", payload: { kind: "text", text: response } }];
    }
    const impl = getNode(node.type);
    if (!impl) {
        const allowed = listNodes()
            .map((entry) => entry.type)
            .sort();
        throw new Error(`Unknown node type "${node.type}". Available types: ${allowed.join(", ")}`);
    }
    throwIfAborted(st.abortController.signal);
    const ctx = createExecCtx(st, node);
    const started = Date.now();
    try {
        const result = await abortablePromise(st.abortController.signal, impl.execute(ctx, node), `Run cancelled while executing node ${node.id}.`);
        return Array.isArray(result) ? result : [];
    }
    catch (error) {
        if (isAbortError(error)) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        await ctx.recordProgress({ tokens: 0, latencyMs: Date.now() - started, status: "error", message });
        throw error;
    }
}
function emitWireTransfers(st, node, port, payloads) {
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
        const bytes = payloads.reduce((total, payload) => {
            try {
                const serialized = JSON.stringify(payload);
                return total + Buffer.byteLength(serialized, "utf8");
            }
            catch (error) {
                return total;
            }
        }, 0);
        emitEdgeTransfer(st.runId, edge.id ?? `${node.id}:${port}->${edge.to[0]}:${edge.to[1]}`, bytes);
    }
}
async function runModel(prompt, signal) {
    throwIfAborted(signal);
    const registry = await getModelRegistry();
    const models = Array.isArray(registry?.models)
        ? registry.models
        : [];
    const selected = models.find((model) => model.status === "installed") ??
        models.find((model) => model.status === "available-local") ??
        models[0];
    if (!selected) {
        throw new Error("No models are available to execute llm.generic nodes.");
    }
    throwIfAborted(signal);
    const rawParams = {
        modelId: selected.id,
        adapter: selected.adapter ?? selected.backend ?? DEFAULT_ADAPTER,
        runtime: selected.runtime ?? DEFAULT_RUNTIME,
        temperature: selected.temperature ?? DEFAULT_TEMPERATURE,
        maxTokens: selected.maxTokens ?? DEFAULT_MAX_TOKENS,
    };
    const { params, modelFile } = await resolveLLMJobConfig(rawParams);
    throwIfAborted(signal);
    const result = await runLLMWithFallback({ params, prompt, modelFile }, signal);
    throwIfAborted(signal);
    return typeof result?.text === "string" ? result.text : "";
}
