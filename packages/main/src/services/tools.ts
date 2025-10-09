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

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export async function invokeTool(
  name: string,
  args: unknown,
  context: { runId: string; nodeId: string },
  signal?: AbortSignal
): Promise<unknown> {
  const handler = getTool(name);
  if (!handler) {
    throw new Error(`Tool "${name}" is not registered.`);
  }
  const invoke = () => Promise.resolve().then(() => handler(args, context));
  if (!signal) {
    return invoke();
  }
  if (signal.aborted) {
    const reason = signal.reason instanceof Error ? signal.reason : createAbortError("Tool invocation aborted.");
    throw reason;
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      const reason = signal.reason instanceof Error ? signal.reason : createAbortError("Tool invocation aborted.");
      reject(reason);
    };
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    invoke().then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
}

// Register a default echo tool for development flows so Tool Call nodes have a
// predictable fallback when no custom tools are configured.
registerTool("echo", async (args) => ({ echo: args ?? null }));
