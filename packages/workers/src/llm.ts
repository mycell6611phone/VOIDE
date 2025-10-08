// @ts-nocheck
import type { LLMParams, RuntimeProfile } from "@voide/shared";

const llamaCppModuleUrl = new URL("../../../adapters/dist/src/llamaCpp.js", import.meta.url);
const gpt4AllModuleUrl = new URL("../../../adapters/dist/src/gpt4all.js", import.meta.url);

let llamaModulePromise: Promise<any> | null = null;
function loadLlamaAdapter() {
  if (!llamaModulePromise) {
    llamaModulePromise = import(llamaCppModuleUrl.href);
  }
  return llamaModulePromise;
}

let gpt4AllModulePromise: Promise<any> | null = null;
function loadGpt4AllAdapter() {
  if (!gpt4AllModulePromise) {
    gpt4AllModulePromise = import(gpt4AllModuleUrl.href);
  }
  return gpt4AllModulePromise;
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
      throw new Error("Mock adapter is disabled. Configure a real LLM adapter such as 'gpt4all' or 'llama.cpp'.");
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
