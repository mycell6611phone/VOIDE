import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { register } from "node:module";

async function main() {
  const originalHome = process.env.HOME;
  const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "voide-llm-"));
  process.env.HOME = tmpHome;
  try {
    const modelsDir = path.join(tmpHome, ".voide", "models");
    await fs.mkdir(modelsDir, { recursive: true });

    const modelFilePath = path.join(modelsDir, "ReasonerV1", "reasoner.bin");
    await fs.mkdir(path.dirname(modelFilePath), { recursive: true });
    await fs.writeFile(modelFilePath, "stub-model");

    const registryData = {
      models: [
        {
          id: "ReasonerV1",
          name: "Reasoner v1",
          backend: "llamacpp",
          filename: "reasoner.bin",
          sha256: "abc",
          sizeBytes: 12,
          status: "installed",
          defaults: {
            adapter: "llama.cpp",
            temperature: 0.33,
            maxTokens: 4096,
            runtime: "CUDA",
          },
        },
      ],
    };
    await fs.writeFile(path.join(modelsDir, "models.json"), JSON.stringify(registryData));

    const loaderUrl = pathToFileURL(path.resolve("tests", "orchestrator-loader.mjs"));
    await register(loaderUrl.href, import.meta.url);

    globalThis.__voideOrchestratorMock = {
      runs: [],
      registry: registryData,
      poolResult: { text: "ok", tokens: 10, latencyMs: 5 },
    };

    const engineUrl = pathToFileURL(path.resolve("packages", "main", "dist", "orchestrator", "engine.js"));
    const engine = await import(engineUrl.href);
    const state = globalThis.__voideOrchestratorMock;

    const flow = {
      id: "flow-verify",
      version: "1",
      nodes: [
        {
          id: "system",
          type: "system.prompt",
          name: "system",
          params: { text: "Hello" },
          in: [],
          out: [{ port: "out", types: ["text"] }],
        },
        {
          id: "llm",
          type: "llm.generic",
          name: "llm",
          params: { modelId: "ReasonerV1", adapter: "llama.cpp" },
          in: [{ port: "prompt", types: ["text"] }],
          out: [{ port: "completion", types: ["text"] }],
        },
        {
          id: "output",
          type: "output",
          name: "output",
          params: {},
          in: [{ port: "in", types: ["text"] }],
          out: [],
        },
      ],
      edges: [
        { id: "e1", from: ["system", "out"], to: ["llm", "prompt"] },
        { id: "e2", from: ["llm", "completion"], to: ["output", "in"] },
      ],
    };

    await engine.runFlow(flow);
    for (let i = 0; i < 50 && state.runs.length === 0; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    await engine.shutdownOrchestrator();

    assert.equal(state.runs.length, 1);
    const job = state.runs[0].payload;
    assert.equal(job.params.adapter, "llama.cpp");
    assert.equal(job.params.runtime, "CUDA");
    assert.equal(job.params.temperature, 0.33);
    assert.equal(job.params.maxTokens, 4096);
    assert.equal(job.modelFile, modelFilePath);
    console.log("Adapter:", job.params.adapter);
    console.log("Runtime:", job.params.runtime);
    console.log("Temperature:", job.params.temperature);
    console.log("MaxTokens:", job.params.maxTokens);
    console.log("ModelFile:", job.modelFile);
  } finally {
    delete globalThis.__voideOrchestratorMock;
    process.env.HOME = originalHome;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
