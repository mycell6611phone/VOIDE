import { runLlamaCpp } from "../../adapters/dist/llamaCpp.js";
import { runGpt4All } from "../../adapters/dist/gpt4all.js";
import { runMock } from "../../adapters/dist/mock.js";
function tokensOf(s) {
    return Math.max(1, Math.round(s.split(/\s+/).length * 1.3));
}
export default async function run(job) {
    const { params, prompt, modelFile } = job;
    const t0 = Date.now();
    let text = "";
    if (params.adapter === "mock")
        text = await runMock(prompt);
    else if (params.adapter === "gpt4all")
        text = await runGpt4All({ modelFile, prompt, maxTokens: params.maxTokens, temperature: params.temperature });
    else if (params.adapter === "llama.cpp")
        text = await runLlamaCpp({ modelFile, prompt, maxTokens: params.maxTokens, temperature: params.temperature, runtime: params.runtime });
    const dt = Date.now() - t0;
    return { text, tokens: tokensOf(text), latencyMs: dt };
}
