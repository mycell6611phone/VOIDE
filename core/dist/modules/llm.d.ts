import { z } from "zod";
export declare const LLMInputSchema: z.ZodObject<{
    system: z.ZodDefault<z.ZodString>;
    user: z.ZodDefault<z.ZodString>;
    assistant: z.ZodDefault<z.ZodString>;
    context: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    system: z.ZodDefault<z.ZodString>;
    user: z.ZodDefault<z.ZodString>;
    assistant: z.ZodDefault<z.ZodString>;
    context: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    system: z.ZodDefault<z.ZodString>;
    user: z.ZodDefault<z.ZodString>;
    assistant: z.ZodDefault<z.ZodString>;
    context: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.ZodTypeAny, "passthrough">>;
export type LLMInput = z.infer<typeof LLMInputSchema>;
export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface LLMProvider {
    supportsSystem?: boolean;
    generate(messages: ChatMessage[], params: Record<string, any>): Promise<string>;
}
export declare function runLLM(provider: LLMProvider, raw: unknown): Promise<LLMInput & {
    output: string;
}>;
export declare class MockCPUProvider implements LLMProvider {
    supportsSystem: boolean;
    constructor(supportsSystem?: boolean);
    generate(messages: ChatMessage[]): Promise<string>;
}
