// @ts-nocheck
import type { LLMParams, RuntimeProfile } from "@voide/shared";

import { runLlamaCpp } from "../../adapters/dist/llamaCpp.js";
import { runGpt4All } from "../../adapters/dist/gpt4all.js";
import { runMock } from "../../adapters/dist/mock.js";

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
      text = await runMock(prompt);
      break;
    case "gpt4all":
      text = await runGpt4All({ modelFile, prompt, maxTokens: params.maxTokens, temperature: params.temperature });
      break;
    case "llama.cpp":
      text = await runLlamaCpp({ modelFile, prompt, maxTokens: params.maxTokens, temperature: params.temperature, runtime: params.runtime as RuntimeProfile });
      break;
    default:
      throw new Error(`Unknown adapter "${adapter}" requested.`);
  }
  const dt = Date.now() - t0;
  return { text, tokens: tokensOf(text), latencyMs: dt };
}
