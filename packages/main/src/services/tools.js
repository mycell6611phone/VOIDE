const registry = new Map();
export function registerTool(name, handler) {
    const key = name.trim();
    if (!key) {
        throw new Error("Tool name must be a non-empty string.");
    }
    registry.set(key, handler);
}
export function getTool(name) {
    return registry.get(name.trim());
}
export function listTools() {
    return Array.from(registry.keys());
}
function createAbortError(message) {
    const error = new Error(message);
    error.name = "AbortError";
    return error;
}
export async function invokeTool(name, args, context, signal) {
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
        invoke().then((value) => {
            cleanup();
            resolve(value);
        }, (error) => {
            cleanup();
            reject(error);
        });
    });
}
// Register a default echo tool for development flows so Tool Call nodes have a
// predictable fallback when no custom tools are configured.
registerTool("echo", async (args) => ({ echo: args ?? null }));
