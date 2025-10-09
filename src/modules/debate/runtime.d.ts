import { DebateConfig } from "./debateConfig";
/** Payload passed between modules */
export interface ModulePayload {
    text: string;
    meta: Record<string, any>;
}
/**
 * Thin wrapper around the LLM backend. Tests mock this.
 */
declare let _llmRequest: (prompt: string, _opts?: any) => Promise<string>;
export declare function setLlmRequest(fn: typeof _llmRequest): void;
export declare const llmRequest: typeof _llmRequest;
/**
 * Execute the Debate module.
 */
export declare function executeDebate(input: ModulePayload, cfg: DebateConfig): Promise<ModulePayload>;
export {};
//# sourceMappingURL=runtime.d.ts.map