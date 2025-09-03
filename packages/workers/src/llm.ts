// @ts-nocheck
import type { LLMParams, RuntimeProfile } from "@voide/shared";

const { runLlamaCpp } = require("../../adapters/dist/llamaCpp.js");
const { runGpt4All } = require("../../adapters/dist/gpt4all.js");
const { runMock } = require("../../adapters/dist/mock.js");

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
  if (params.adapter === "mock") text = await runMock(prompt);
  else if (params.adapter === "gpt4all") text = await runGpt4All({ modelFile, prompt, maxTokens: params.maxTokens, temperature: params.temperature });
  else if (params.adapter === "llama.cpp") text = await runLlamaCpp({ modelFile, prompt, maxTokens: params.maxTokens, temperature: params.temperature, runtime: params.runtime as RuntimeProfile });
  const dt = Date.now() - t0;
  return { text, tokens: tokensOf(text), latencyMs: dt };
}
