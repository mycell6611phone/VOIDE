export const DEFAULT_LABEL = "LLM";
export const inputPorts = [
    { port: "prompt", types: ["PromptMsg"] },
];
export const outputPorts = [
    { port: "completion", types: ["string"] },
];
export const nodeDefinition = {
    type: "LLM",
    label: DEFAULT_LABEL,
    in: inputPorts,
    out: outputPorts,
    getLabel(config) {
        const candidate = typeof config?.model_id === "string" ? config.model_id.trim() : "";
        return candidate.length > 0 ? candidate : DEFAULT_LABEL;
    },
};
export default nodeDefinition;
