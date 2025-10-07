import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import electron from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exec = promisify(execFile);

test("basic flow runs via electron", async (t) => {
  const flow = path.resolve(__dirname, "../../../flows/sample-basic.flow.json");
  const runner = path.resolve(__dirname, "e2e-runner.mjs");
  let stdout;

  try {
    ({ stdout } = await exec(electron, [runner, flow], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    }));
  } catch (error) {
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    if (stderr.includes("libatk-1.0.so.0") || stderr.includes("libatk")) {
      t.skip("Electron runtime missing libatk; skipping end-to-end test");
      return;
    }
    throw error;
  }
  const { events, result } = JSON.parse(stdout.trim());
  const lights = events
    .filter((e) => e.type === "node_state")
    .map((e) => `${e.nodeId}:${e.state}`);
  assert.deepEqual(lights, [
    "input:queued",
    "input:running",
    "input:ok",
    "prompt:queued",
    "prompt:running",
    "prompt:ok",
    "llm:queued",
    "llm:running",
    "llm:ok",
    "out:queued",
    "out:running",
    "out:ok",
  ]);
  const pulses = events.filter((e) => e.type === "edge_transfer").map((e) => e.edgeId);
  assert.deepEqual(pulses, ["e1", "e2", "e3"]);
  assert.ok(result.outputs);
});

