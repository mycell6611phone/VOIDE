import { z } from "zod";
export declare const ToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parameters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.ZodTypeAny, "passthrough">>;
export type ToolHandler = (args: any) => Promise<any> | any;
export declare function parseToolCall(text: string): {
    name: string;
    args: any;
} | null;
export declare function handleToolCalls(output: string, tools: Record<string, ToolHandler>): Promise<{
    result: any;
    tool?: string;
}>;
export declare function webSearchTool(args: {
    query: string;
}): Promise<string>;
