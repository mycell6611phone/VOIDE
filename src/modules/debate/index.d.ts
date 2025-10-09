export { DebateModuleNode, runDebateNode } from "./DebateModuleNode";
export { executeDebate, llmRequest } from "./runtime";
export { DebateFormat, DebateConfig, debateConfigFromBytes, debateConfigToBytes, } from "./debateConfig";
export declare function registerDebateModule(canvas: {
    registerNodeType: (type: string, comp: any) => void;
}): void;
//# sourceMappingURL=index.d.ts.map