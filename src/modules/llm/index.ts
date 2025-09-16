export interface NodePortDefinition {
  port: string;
  types: readonly string[];
}

export interface ModuleConfiguration {
  model_id?: string | null;
  [key: string]: unknown;
}

export interface ModuleNodeDefinition {
  type: string;
  label: string;
  in: readonly NodePortDefinition[];
  out: readonly NodePortDefinition[];
  getLabel(config?: ModuleConfiguration | null): string;
}

export const DEFAULT_LABEL = "LLM";

export const inputPorts = [
  { port: "prompt", types: ["PromptMsg"] },
] satisfies readonly NodePortDefinition[];

export const outputPorts = [
  { port: "completion", types: ["string"] },
] satisfies readonly NodePortDefinition[];

export const nodeDefinition: ModuleNodeDefinition = {
  type: "LLM",
  label: DEFAULT_LABEL,
  in: inputPorts,
  out: outputPorts,
  getLabel(config) {
    const candidate =
      typeof config?.model_id === "string" ? config.model_id.trim() : "";
    return candidate.length > 0 ? candidate : DEFAULT_LABEL;
  },
};

export default nodeDefinition;
