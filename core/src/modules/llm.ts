import { z } from "zod";

export const LLMInputSchema = z
  .object({
    system: z.string().default(""),
    user: z.string().default(""),
    assistant: z.string().default(""),
    context: z.array(z.string()).default([]),
    params: z.record(z.any()).default({}),
  })
  .passthrough();

export type LLMInput = z.infer<typeof LLMInputSchema>;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  supportsSystem?: boolean;
  generate(messages: ChatMessage[], params: Record<string, any>): Promise<string>;
}

export async function runLLM(
  provider: LLMProvider,
  raw: unknown
): Promise<LLMInput & { output: string }> {
  const cfg = LLMInputSchema.parse(raw);
  const messages: ChatMessage[] = [];
  if (cfg.system) messages.push({ role: "system", content: cfg.system });
  for (const c of cfg.context) messages.push({ role: "user", content: c });
  if (cfg.user) messages.push({ role: "user", content: cfg.user });
  if (cfg.assistant) messages.push({ role: "assistant", content: cfg.assistant });

  if (!provider.supportsSystem) {
    const idx = messages.findIndex((m) => m.role === "system");
    if (idx >= 0) {
      const sys = messages[idx].content;
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) firstUser.content = sys + "\n" + firstUser.content;
      else messages.push({ role: "user", content: sys });
      messages.splice(idx, 1);
    }
  }

  const text = await provider.generate(messages, cfg.params);
  return { ...cfg, output: text };
}

export class MockCPUProvider implements LLMProvider {
  constructor(public supportsSystem: boolean = false) {}
  async generate(messages: ChatMessage[]): Promise<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const template = lastUser?.content ?? "";
    return template.replace(/\{\{\s*(system|user|assistant)\s*\}\}/g, (_, role) => {
      const found = [...messages].reverse().find((m) => m.role === role);
      return found ? found.content : "";
    });
  }
}

