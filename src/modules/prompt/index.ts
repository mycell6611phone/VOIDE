export { PromptModuleNode } from "./PromptModuleNode";
export type { PromptModuleNodeProps } from "./PromptModuleNode";
export {
  promptConfigFromBytes,
  promptConfigToBytes,
  defaultPromptConfig,
} from "./promptConfig";

export function registerPromptModule(canvas: {
  registerNodeType: (type: string, component: any) => void;
}) {
  canvas.registerNodeType("Prompt", PromptModuleNode);
}

