import { z } from "zod";
// Input Node
const InputNode = {
    kind: "InputNode",
    inPorts: {},
    outPorts: { text: "UserText" },
    async execute({ config, context }) {
        const value = context.inputs[config.id] ?? "";
        const out = { text: String(value) };
        return { text: out };
    },
};
// Prompt Node
const PromptNode = {
    kind: "PromptNode",
    inPorts: { text: "UserText" },
    outPorts: { prompt: "PromptText" },
    async execute({ inputs }) {
        const template = "{{text}}";
        const text = inputs.text?.text ?? "";
        const rendered = template.replace(/{{\s*text\s*}}/g, escape(String(text)));
        const out = { text: rendered };
        return { prompt: out };
    },
};
function escape(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
// LLM Node
const LLMNode = {
    kind: "LLMNode",
    inPorts: { prompt: "PromptText" },
    outPorts: { text: "LLMText" },
    async execute({ inputs, config, providers }) {
        const provider = providers?.[config.model];
        if (!provider)
            throw new Error(`Unknown provider: ${config.model}`);
        const prompt = inputs.prompt?.text ?? "";
        const text = await provider.generate(prompt);
        const out = { text };
        return { text: out };
    },
};
export class StubProvider {
    async generate(prompt) {
        if (prompt.toLowerCase().includes("bullet")) {
            return "- one\n- two";
        }
        return prompt;
    }
}
// Branch Node
const BranchNode = {
    kind: "BranchNode",
    inPorts: { text: "LLMText" },
    outPorts: { pass: "LLMText", fail: "LLMText" },
    async execute({ inputs, config }) {
        const text = inputs.text;
        if (text.text.includes(config.condition)) {
            return { pass: text };
        }
        return { fail: text };
    },
};
// Router-Divider Node
const RouterDividerNode = {
    kind: "RouterDividerNode",
    inPorts: { text: "UserText" },
    outPorts: { valid: "LLMText", invalid: "LLMText" },
    async execute({ inputs }) {
        const schema = z
            .object({ text: z.string() })
            .refine((d) => d.text.trim().startsWith("-"));
        const payload = inputs.text ?? { text: "" };
        if (schema.safeParse(payload).success) {
            return { valid: { text: payload.text } };
        }
        return { invalid: { text: payload.text } };
    },
};
// Bullet List Normalizer
const BulletListNormalizerNode = {
    kind: "BulletListNormalizerNode",
    inPorts: { text: "LLMText" },
    outPorts: { text: "LLMText" },
    async execute({ inputs }) {
        const raw = String(inputs.text?.text ?? "");
        const lines = raw
            .split(/\n+/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
        const normalized = lines
            .map((l) => (l.startsWith("-") ? l : `- ${l}`))
            .join("\n");
        return { text: { text: normalized } };
    },
};
// Log Node
const LogNode = {
    kind: "LogNode",
    inPorts: { value: "AnyBlob" },
    outPorts: { value: "AnyBlob" },
    async execute({ inputs, config, context }) {
        context.log?.(`${config.name}:`, inputs.value);
        return { value: inputs.value };
    },
};
// Output Node
const OutputNode = {
    kind: "OutputNode",
    inPorts: { text: "LLMText" },
    outPorts: {},
    async execute({ inputs, config, context }) {
        context.outputs[config.name] = inputs.text?.text ?? "";
        return {};
    },
};
export function registerBuiltins(registry) {
    registry.register(InputNode);
    registry.register(PromptNode);
    registry.register(LLMNode);
    registry.register(BranchNode);
    registry.register(RouterDividerNode);
    registry.register(BulletListNormalizerNode);
    registry.register(LogNode);
    registry.register(OutputNode);
}
export { InputNode, PromptNode, LLMNode, BranchNode, RouterDividerNode, BulletListNormalizerNode, LogNode, OutputNode, };
