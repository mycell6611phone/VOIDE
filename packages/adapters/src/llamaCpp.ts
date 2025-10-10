import { execa } from "execa";
import os from "node:os";

export interface LlamaRunArgs {
  modelFile: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  runtime: 'CPU' | 'CUDA';
  threads?: number;
  gpuLayers?: number;
  llamaBin?: string;
  signal?: AbortSignal;
}

export async function runLlamaCpp(args: LlamaRunArgs): Promise<string> {
  const llamaBin = args.llamaBin ?? process.env.LLAMA_BIN ?? "llama-cli";
  const threads = args.threads ?? Math.max(1, os.cpus().length - 1);
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
  const { stdout } = await execa(llamaBin, cmdArgs, {
    env: { LLAMA_ARG_MAX: "65536" },
    signal: args.signal,
  });
  return stdout.trim();
}
