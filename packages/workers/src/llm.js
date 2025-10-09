import { runLlamaCpp } from "../../adapters/dist/llamaCpp.js";
import { runGpt4All } from "../../adapters/dist/gpt4all.js";
const llamaCppModuleUrl = new URL("../../../adapters/dist/src/llamaCpp.js", import.meta.url);
const gpt4AllModuleUrl = new URL("../../../adapters/dist/src/gpt4all.js", import.meta.url);
let llamaAdapterPromise;
let gpt4AllAdapterPromise;
function isModuleResolutionError(error) {
    if (!error || typeof error !== "object") {
        return false;
    }
    const code = error.code;
    return code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND";
}
async function loadLlamaAdapter() {
    if (!llamaAdapterPromise) {
        llamaAdapterPromise = import(llamaCppModuleUrl.href)
            .then((module) => {
            if (typeof module?.runLlamaCpp === "function") {
                return module;
            }
            if (typeof module?.default === "function") {
                return { runLlamaCpp: module.default };
            }
            throw new Error("llama.cpp adapter module is missing the runLlamaCpp export.");
        })
            .catch((error) => {
            if (isModuleResolutionError(error)) {
                return { runLlamaCpp };
            }
            throw error;
        });
    }
    return llamaAdapterPromise;
}
async function loadGpt4AllAdapter() {
    if (!gpt4AllAdapterPromise) {
        gpt4AllAdapterPromise = import(gpt4AllModuleUrl.href)
            .then((module) => {
            if (typeof module?.runGpt4All === "function") {
                return module;
            }
            if (typeof module?.default === "function") {
                return { runGpt4All: module.default };
            }
            throw new Error("gpt4all adapter module is missing the runGpt4All export.");
        })
            .catch((error) => {
            if (isModuleResolutionError(error)) {
                return { runGpt4All };
            }
            throw error;
        });
    }
    return gpt4AllAdapterPromise;
}
function tokensOf(s) {
    return Math.max(1, Math.round(s.split(/\s+/).length * 1.3));
}
export default async function run(job) {
    const { params, prompt, modelFile } = job;
    const t0 = Date.now();
    let text = "";
    const adapter = params.adapter;
    if (!adapter) {
        throw new Error("LLM adapter not specified in job parameters.");
    }
    switch (adapter) {
        case "mock":
            throw new Error("The mock LLM adapter has been disabled. Configure the node to use llama.cpp or gpt4all instead.");
        case "gpt4all":
            text = await (await loadGpt4AllAdapter()).runGpt4All({
                modelFile,
                prompt,
                maxTokens: params.maxTokens,
                temperature: params.temperature,
            });
            break;
        case "llama.cpp":
            text = await (await loadLlamaAdapter()).runLlamaCpp({
                modelFile,
                prompt,
                maxTokens: params.maxTokens,
                temperature: params.temperature,
                runtime: params.runtime,
            });
            break;
        default:
            throw new Error(`Unknown adapter "${adapter}" requested.`);
    }
    const dt = Date.now() - t0;
    return { text, tokens: tokensOf(text), latencyMs: dt };
}
