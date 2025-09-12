import {
  NodeHandler,
  NodeRegistry,
  ExecuteArgs,
} from "../sdk/node.js";
import {
  UserText,
  PromptText,
  LLMText,
} from "../runtime/types.js";
import { z } from "zod";

// Provider interface
export interface LLMProvider {
  generate(prompt: string): Promise<string>;
}

export interface Providers {
  [name: string]: LLMProvider;
}

// Input Node
const InputNode: NodeHandler<{}, { text: "UserText" }, { id: string }> = {
  kind: "InputNode",
  inPorts: {},
  outPorts: { text: "UserText" },
  async execute({ config, context }: ExecuteArgs<{}, { id: string }>) {
    const value = context.inputs[config.id] ?? "";
    const out: UserText = { text: String(value) };
    return { text: out };
  },
};

// Prompt Node
const PromptNode: NodeHandler<{ text: "UserText" }, { prompt: "PromptText" }, {}> = {
  kind: "PromptNode",
  inPorts: { text: "UserText" },
  outPorts: { prompt: "PromptText" },
  async execute({ inputs }: ExecuteArgs<{ text: "UserText" }, {}>) {
    const template = "{{text}}";
    const text = inputs.text?.text ?? "";
    const rendered = template.replace(/{{\s*text\s*}}/g, escape(String(text)));
    const out: PromptText = { text: rendered };
    return { prompt: out };
  },
};

function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// LLM Node
const LLMNode: NodeHandler<{ prompt: "PromptText" }, { text: "LLMText" }, { model: string }> = {
  kind: "LLMNode",
  inPorts: { prompt: "PromptText" },
  outPorts: { text: "LLMText" },
  async execute({ inputs, config, providers }: ExecuteArgs<{ prompt: "PromptText" }, { model: string }>) {
    const provider = providers?.[config.model];
    if (!provider) throw new Error(`Unknown provider: ${config.model}`);
    const prompt = inputs.prompt?.text ?? "";
    const text = await provider.generate(prompt);
    const out: LLMText = { text };
    return { text: out };
  },
};

export class StubProvider implements LLMProvider {
  async generate(prompt: string): Promise<string> {
    if (prompt.toLowerCase().includes("bullet")) {
      return "- one\n- two";
    }
    return prompt;
  }
}

// Branch Node
const BranchNode: NodeHandler<{ text: "LLMText" }, { pass: "LLMText"; fail: "LLMText" }, { condition: string }> = {
  kind: "BranchNode",
  inPorts: { text: "LLMText" },
  outPorts: { pass: "LLMText", fail: "LLMText" },
  async execute({ inputs, config }: ExecuteArgs<{ text: "LLMText" }, { condition: string }>) {
    const text = inputs.text;
    if (text.text.includes(config.condition)) {
      return { pass: text } as any;
    }
    return { fail: text } as any;
  },
};

// Router-Divider Node
const RouterDividerNode: NodeHandler<
  { text: "UserText" },
  { valid: "LLMText"; invalid: "LLMText" },
  {}
> = {
  kind: "RouterDividerNode",
  inPorts: { text: "UserText" },
  outPorts: { valid: "LLMText", invalid: "LLMText" },
  async execute({ inputs }: ExecuteArgs<{ text: "UserText" }, {}>) {
    const schema = z
      .object({ text: z.string() })
      .refine((d: { text: string }) => d.text.trim().startsWith("-"));
    const payload = inputs.text ?? { text: "" };
    if (schema.safeParse(payload).success) {
      return { valid: { text: payload.text } } as any;
    }
    return { invalid: { text: payload.text } } as any;
  },
};

// Bullet List Normalizer
const BulletListNormalizerNode: NodeHandler<
  { text: "LLMText" },
  { text: "LLMText" },
  {}
> = {
  kind: "BulletListNormalizerNode",
  inPorts: { text: "LLMText" },
  outPorts: { text: "LLMText" },
  async execute({ inputs }: ExecuteArgs<{ text: "LLMText" }, {}>) {
    const raw: string = String(inputs.text?.text ?? "");
    const lines = raw
      .split(/\n+/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);
    const normalized = lines
      .map((l: string) => (l.startsWith("-") ? l : `- ${l}`))
      .join("\n");
    return { text: { text: normalized } };
  },
};

// Log Node
const LogNode: NodeHandler<{ value: "AnyBlob" }, { value: "AnyBlob" }, { name: string }> = {
  kind: "LogNode",
  inPorts: { value: "AnyBlob" },
  outPorts: { value: "AnyBlob" },
  async execute({ inputs, config, context }: ExecuteArgs<{ value: "AnyBlob" }, { name: string }>) {
    context.log?.(`${config.name}:`, inputs.value);
    return { value: inputs.value };
  },
};

// Output Node
const OutputNode: NodeHandler<{ text: "LLMText" }, {}, { name: string }> = {
  kind: "OutputNode",
  inPorts: { text: "LLMText" },
  outPorts: {},
  async execute({ inputs, config, context }: ExecuteArgs<{ text: "LLMText" }, { name: string }>) {
    context.outputs[config.name] = inputs.text?.text ?? "";
    return {};
  },
};

export function registerBuiltins(registry: NodeRegistry) {
  registry.register(InputNode);
  registry.register(PromptNode);
  registry.register(LLMNode);
  registry.register(BranchNode);
  registry.register(RouterDividerNode);
  registry.register(BulletListNormalizerNode);
  registry.register(LogNode);
  registry.register(OutputNode);
}

export {
  InputNode,
  PromptNode,
  LLMNode,
  BranchNode,
  RouterDividerNode,
  BulletListNormalizerNode,
  LogNode,
  OutputNode,
};
