export declare enum DebateFormat {
    SINGLE_PASS_VALIDATE = 0,
    CONCISENESS_MULTI_PASS = 1,
    DEBATE_ADD_ON = 2,
    CUSTOM = 3
}
export interface DebateConfig {
    debateFormat: DebateFormat;
    customPrompt: string;
    roundNumber: number;
    iterativeLoop: boolean;
    loopTargetModuleId: string;
}
declare const defaultConfig: DebateConfig;
export declare function debateConfigToBytes(cfg: DebateConfig): Uint8Array;
export declare function debateConfigFromBytes(bytes: Uint8Array): DebateConfig;
export { defaultConfig as DebateConfigDefault };
//# sourceMappingURL=debateConfig.d.ts.map