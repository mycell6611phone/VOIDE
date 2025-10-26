export { DebateModuleNode, runDebateNode } from "./DebateModuleNode";
export { executeDebate, llmRequest } from "./runtime";
export { DebateFormat, debateConfigFromBytes, debateConfigToBytes, } from "./debateConfig";
// Minimal canvas registration hook
export function registerDebateModule(canvas) {
    canvas.registerNodeType("Debate", DebateModuleNode);
}
