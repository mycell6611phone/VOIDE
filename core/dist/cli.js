#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs/promises";
import { compile } from "./build/compiler.js";
import { runFlow } from "./run/index.js";
import { StubProvider } from "./nodes/builtins.js";
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
};
function parseInputs(values) {
    const out = {};
    for (const v of values ?? []) {
        const idx = v.indexOf("=");
        if (idx === -1)
            continue;
        const key = v.slice(0, idx);
        const val = v.slice(idx + 1);
        out[key] = val;
    }
    return out;
}
async function buildCanvas(canvasPath, outPath) {
    const raw = await fs.readFile(canvasPath, "utf8");
    const canvas = JSON.parse(raw);
    const flowBin = compile(canvas);
    await fs.writeFile(outPath, Buffer.from(flowBin));
    console.log(`wrote ${outPath}`);
}
async function runFlowFile(flowPath, inputVals, providerName) {
    const buf = await fs.readFile(flowPath);
    const inputs = parseInputs(inputVals);
    const providers = { [providerName]: new StubProvider() };
    const iter = runFlow(new Uint8Array(buf), inputs, providers);
    while (true) {
        const { value, done } = await iter.next();
        if (done) {
            console.log(colors.green + "DONE" + colors.reset);
            console.log(JSON.stringify(value.outputs, null, 2));
            break;
        }
        switch (value.type) {
            case "NODE_START":
                console.log(colors.cyan + `start ${value.nodeId}` + colors.reset);
                break;
            case "NODE_END":
                console.log(colors.green + `end ${value.nodeId}` + colors.reset);
                break;
            case "NODE_ERROR":
                console.log(colors.red + `error ${value.nodeId}: ${value.error.message}` + colors.reset);
                break;
            case "EDGE_EMIT":
                console.log(colors.yellow + `${value.from} -> ${value.to}` + colors.reset);
                break;
        }
    }
}
const program = new Command();
program.name("voide").description("VOIDE CLI");
program
    .command("build")
    .argument("<canvas>", "canvas JSON file")
    .option("-o, --out <file>", "output flow binary", "flow.bin")
    .action(async (canvas, opts) => {
    await buildCanvas(canvas, opts.out);
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
