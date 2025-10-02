import { z } from "zod";
export declare const PromptConfigSchema: z.ZodObject<{
    text: z.ZodString;
    preset: z.ZodDefault<z.ZodString>;
    to: z.ZodDefault<z.ZodEnum<["system", "user"]>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    text: z.ZodString;
    preset: z.ZodDefault<z.ZodString>;
    to: z.ZodDefault<z.ZodEnum<["system", "user"]>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    text: z.ZodString;
    preset: z.ZodDefault<z.ZodString>;
    to: z.ZodDefault<z.ZodEnum<["system", "user"]>>;
}, z.ZodTypeAny, "passthrough">>;
export type PromptConfig = z.infer<typeof PromptConfigSchema>;
export declare function applyPrompt(base: any, rawCfg: unknown): any;
