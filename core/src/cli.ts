#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs/promises";
import { compile } from "./build/compiler.js";
import { parseFlow } from "./flow/schema.js";
import { runFlow } from "./run/index.js";
import { StubProvider, Providers } from "./nodes/builtins.js";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function parseInputs(values: string[] | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  for (const v of values ?? []) {
    const idx = v.indexOf("=");
    if (idx === -1) continue;
    const key = v.slice(0, idx);
    const val = v.slice(idx + 1);
    out[key] = val;
  }
  return out;
}

async function runFlowFile(
  flowPath: string,
  inputVals: string[] | undefined,
  providerName: string,
): Promise<void> {
  const buf = await fs.readFile(flowPath);
  const inputs = parseInputs(inputVals);
  const providers: Providers = { [providerName]: new StubProvider() };

  const iter = runFlow(new Uint8Array(buf), inputs, providers);

  while (true) {
    const { value, done } = await iter.next();
    if (done) {
      console.log(colors.green + "DONE" + colors.reset);
      console.log(JSON.stringify(value.outputs, null, 2));
      break;
    }

    switch (value.type) {
      case "NODE_STATE": {
        const { nodeId, state } = value;
        if (state === "running") {
          console.log(colors.cyan + `start ${nodeId}` + colors.reset);
        } else if (state === "ok") {
          console.log(colors.green + `end ${nodeId}` + colors.reset);
        } else if (state === "error") {
          console.log(colors.red + `error ${nodeId}` + colors.reset);
        }
        break;
      }
      case "EDGE_EMIT":
        console.log(
          colors.yellow + `${value.from} -> ${value.to}` + colors.reset,
        );
        break;
    }
  }
}

async function validateFile(path: string): Promise<void> {
  const raw = await fs.readFile(path, "utf8");
  const flow = parseFlow(raw);
  console.log(JSON.stringify(flow, null, 2));
}

async function packFile(src: string, outPath?: string): Promise<void> {
  const raw = await fs.readFile(src, "utf8");
  const flow = parseFlow(raw);
  const bin = compile(flow);
  const out =
    outPath ?? src.replace(/\.flow\.json$/i, ".flow.pb");
  await fs.writeFile(out, Buffer.from(bin));
  console.log(`wrote ${out}`);
}

const program = new Command();
program.name("voide").description("VOIDE CLI");

program
  .command("validate")
  .argument("<flow>", "flow JSON file")
  .action(async (flow) => {
    try {
      await validateFile(flow);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command("pack")
  .argument("<flow>", "flow JSON file")
  .option("-o, --out <file>", "output protobuf file")
  .action(async (flow, opts) => {
    try {
      await packFile(flow, opts.out);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command("run")
  .argument("<flow>", "compiled flow binary")
  .option("--input <kv...>", "runtime inputs")
  .option("--provider <name>", "LLM provider", "stub")
  .action(async (flow, opts) => {
    await runFlowFile(flow, opts.input, opts.provider);
  });

program.parseAsync();

