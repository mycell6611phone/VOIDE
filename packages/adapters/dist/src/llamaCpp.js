"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLlamaCpp = runLlamaCpp;
const execa_1 = require("execa");
async function runLlamaCpp(args) {
    const llamaBin = args.llamaBin ?? process.env.LLAMA_BIN ?? "llama-cli";
    const threads = args.threads ?? Math.max(1, require('os').cpus().length - 1);
    const gpuLayers = args.gpuLayers ?? (args.runtime === 'CUDA' ? 35 : 0);
    const cmdArgs = [
        "-m", args.modelFile,
        "-p", args.prompt,
        "-n", String(args.maxTokens),
        "-temp", String(args.temperature),
        "-t", String(threads),
        "-ngl", String(gpuLayers),
        "--no-display-prompt"
    ];
    const { stdout } = await (0, execa_1.execa)(llamaBin, cmdArgs, { env: { LLAMA_ARG_MAX: "65536" } });
    return stdout.trim();
}
