import type { LLMParams } from "@voide/shared";
interface LLMJob {
    params: LLMParams;
    prompt: string;
    modelFile: string;
}
export default function run(job: LLMJob): Promise<{
    text: string;
    tokens: number;
    latencyMs: number;
}>;
export {};
//# sourceMappingURL=llm.d.ts.map