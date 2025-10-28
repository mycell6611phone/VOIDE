import { DEFAULT_PROMPT_PRESET_ID } from "@voide/shared";
import { z } from "zod";
export const PromptConfigSchema = z
    .object({
    text: z.string(),
    preset: z.string().default(DEFAULT_PROMPT_PRESET_ID),
    to: z.enum(["system", "user"]).default("user"),
})
    .passthrough();
export function applyPrompt(base, rawCfg) {
    const cfg = PromptConfigSchema.parse(rawCfg);
    const out = { ...base };
    if (cfg.to === "system") {
        out.system = (out.system ? out.system + "\n" : "") + cfg.text;
    }
    else {
        out.user = (out.user ? out.user + "\n" : "") + cfg.text;
    }
    return out;
}
