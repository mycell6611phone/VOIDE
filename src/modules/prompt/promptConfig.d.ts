export type PromptTarget = "system" | "user";
export interface PromptConfigState {
    text: string;
    preset: string;
    to: PromptTarget;
    passthrough: Record<string, unknown>;
}
export declare const defaultPromptConfig: PromptConfigState;
export declare function promptConfigFromBytes(bytes?: Uint8Array | null): PromptConfigState;
export declare function promptConfigToBytes(cfg: PromptConfigState): Uint8Array;
//# sourceMappingURL=promptConfig.d.ts.map