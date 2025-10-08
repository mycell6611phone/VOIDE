// @ts-nocheck
import type { LLMParams, RuntimeProfile } from "@voide/shared";
import { runLlamaCpp } from "../../adapters/dist/llamaCpp.js";
import { runGpt4All } from "../../adapters/dist/gpt4all.js";

const llamaCppModuleUrl = new URL("../../../adapters/dist/src/llamaCpp.js", import.meta.url);
const gpt4AllModuleUrl = new URL("../../../adapters/dist/src/gpt4all.js", import.meta.url);

type LlamaAdapterModule = { runLlamaCpp: typeof runLlamaCpp };
type Gpt4AllAdapterModule = { runGpt4All: typeof runGpt4All };

let llamaAdapterPromise: Promise<LlamaAdapterModule> | undefined;
let gpt4AllAdapterPromise: Promise<Gpt4AllAdapterModule> | undefined;

function isModuleResolutionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = (error as any).code;
  return code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND";
}

async function loadLlamaAdapter(): Promise<LlamaAdapterModule> {
  if (!llamaAdapterPromise) {
    llamaAdapterPromise = import(llamaCppModuleUrl.href)
      .then((module: any) => {
        if (typeof module?.runLlamaCpp === "function") {
          return module as LlamaAdapterModule;
        }
        if (typeof module?.default === "function") {
          return { runLlamaCpp: module.default } as LlamaAdapterModule;
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

async function loadGpt4AllAdapter(): Promise<Gpt4AllAdapterModule> {
  if (!gpt4AllAdapterPromise) {
    gpt4AllAdapterPromise = import(gpt4AllModuleUrl.href)
      .then((module: any) => {
        if (typeof module?.runGpt4All === "function") {
          return module as Gpt4AllAdapterModule;
        }
        if (typeof module?.default === "function") {
          return { runGpt4All: module.default } as Gpt4AllAdapterModule;
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

interface LLMJob {
  params: LLMParams;
  prompt: string;
  modelFile: string;
}

function tokensOf(s: string): number {
  return Math.max(1, Math.round(s.split(/\s+/).length * 1.3));
}

export default async function run(job: LLMJob) {
  const { params, prompt, modelFile } = job;
  const t0 = Date.now();
  let text = "";
  const adapter = params.adapter;
  if (!adapter) {
    throw new Error("LLM adapter not specified in job parameters.");
  }
  switch (adapter) {
    case "mock":

      throw new Error(
        "The mock LLM adapter has been disabled. Configure the node to use llama.cpp or gpt4all instead."
      );

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
        runtime: params.runtime as RuntimeProfile,
      });
      break;
    default:
      throw new Error(`Unknown adapter "${adapter}" requested.`);
  }
  const dt = Date.now() - t0;
  return { text, tokens: tokensOf(text), latencyMs: dt };
}
