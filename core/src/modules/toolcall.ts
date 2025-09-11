import { z } from "zod";

export const ToolSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.any()).default({}),
  })
  .passthrough();

export type ToolHandler = (args: any) => Promise<any> | any;

export function parseToolCall(text: string): {
  name: string;
  args: any;
} | null {
  const m = text.match(/^Tool:(\w+)\s*(\{[\s\S]*\})$/);
  if (!m) return null;
  try {
    return { name: m[1], args: JSON.parse(m[2]) };
  } catch {
    return null;
  }
}

export async function handleToolCalls(
  output: string,
  tools: Record<string, ToolHandler>
): Promise<{ result: any; tool?: string }> {
  const req = parseToolCall(output);
  if (req && tools[req.name]) {
    const result = await tools[req.name](req.args);
    return { result, tool: req.name };
  }
  return { result: output };
}

export async function webSearchTool(args: { query: string }): Promise<string> {
  return `results for ${args.query}`;
}

