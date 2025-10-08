export type ToolHandler = (
  args: unknown,
  context: { runId: string; nodeId: string }
) => Promise<unknown> | unknown;

const registry = new Map<string, ToolHandler>();

export function registerTool(name: string, handler: ToolHandler): void {
  const key = name.trim();
  if (!key) {
    throw new Error("Tool name must be a non-empty string.");
  }
  registry.set(key, handler);
}

export function getTool(name: string): ToolHandler | undefined {
  return registry.get(name.trim());
}

export function listTools(): string[] {
  return Array.from(registry.keys());
}

export async function invokeTool(
  name: string,
  args: unknown,
  context: { runId: string; nodeId: string }
): Promise<unknown> {
  const handler = getTool(name);
  if (!handler) {
    throw new Error(`Tool "${name}" is not registered.`);
  }
  return handler(args, context);
}

// Register a default echo tool for development flows so Tool Call nodes have a
// predictable fallback when no custom tools are configured.
registerTool("echo", async (args) => ({ echo: args ?? null }));
