import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const workerUrl = pathToFileURL(path.resolve("packages/workers/dist/src/llm.js"));

test("llm worker executes selected adapter", async (t) => {
  const originalBin = process.env.LLAMA_BIN;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fake-llama-"));
  const fakeBin = path.join(tmpDir, "llama-bin.sh");
  await fs.writeFile(fakeBin, "#!/bin/sh\necho llama-output\n", { mode: 0o755 });
  process.env.LLAMA_BIN = fakeBin;
  t.after(() => {
    process.env.LLAMA_BIN = originalBin;
  });

  const worker = await import(workerUrl.href);

  const llamaResult = await worker.default({
    params: { adapter: "llama.cpp", maxTokens: 32, temperature: 0.2, runtime: "CPU", modelId: "ReasonerV1" },
    prompt: "hello",
    modelFile: fakeBin,
  });
  assert.equal(llamaResult.text.trim(), "llama-output");

  await assert.rejects(
    () =>
      worker.default({
        params: { adapter: "unknown", maxTokens: 5, temperature: 0.1, runtime: "CPU", modelId: "ReasonerV1" },
        prompt: "hi",
        modelFile: "/tmp/unknown.bin",
      }),
    /Unknown adapter/
  );
});
