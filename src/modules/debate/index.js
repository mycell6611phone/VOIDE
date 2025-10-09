export { DebateModuleNode, runDebateNode } from "./DebateModuleNode";
export { executeDebate, llmRequest } from "./runtime";
export { DebateFormat, DebateConfig, debateConfigFromBytes, debateConfigToBytes, } from "./debateConfig";
// Minimal canvas registration hook
export function registerDebateModule(canvas) {
    canvas.registerNodeType("Debate", DebateModuleNode);
}
