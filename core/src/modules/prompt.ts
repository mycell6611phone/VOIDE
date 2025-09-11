import { z } from "zod";

export const PromptConfigSchema = z
  .object({
    text: z.string(),
    to: z.enum(["system", "user"]).default("user"),
  })
  .passthrough();

export type PromptConfig = z.infer<typeof PromptConfigSchema>;

export function applyPrompt(base: any, rawCfg: unknown): any {
  const cfg = PromptConfigSchema.parse(rawCfg);
  const out: any = { ...base };
  if (cfg.to === "system") {
    out.system = (out.system ? out.system + "\n" : "") + cfg.text;
  } else {
    out.user = (out.user ? out.user + "\n" : "") + cfg.text;
  }
  return out;
}

