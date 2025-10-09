export { PromptModuleNode } from "./PromptModuleNode";
export { promptConfigFromBytes, promptConfigToBytes, defaultPromptConfig, } from "./promptConfig";
export function registerPromptModule(canvas) {
    canvas.registerNodeType("Prompt", PromptModuleNode);
}
