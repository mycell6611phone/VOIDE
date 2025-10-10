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
export declare function runLlamaCpp(args: LlamaRunArgs): Promise<string>;
//# sourceMappingURL=llamaCpp.d.ts.map