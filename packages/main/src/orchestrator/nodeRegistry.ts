import type { NodeDef, PayloadT } from "@voide/shared";

export interface ExecCtx {
  readonly runId: string;
  readonly node: NodeDef;
  readonly runtimeInput?: unknown;
  now(): number;
  getInputs(): Map<string, PayloadT[]>;
  getInput(port: string): PayloadT[];
  getText(port?: string): string[];
  getNodeState<T>(factory: () => T): T;
  updateNodeState<T>(updater: (state: T | undefined) => T | undefined): void;
  recordProgress(details: { tokens?: number; latencyMs?: number; status?: "ok" | "error"; message?: string }): Promise<void>;
  logEntry(details: { tag?: string | null; payload: unknown }): Promise<void>;
  readMemory(namespace: string, key: string): Promise<string | null>;
  writeMemory(namespace: string, key: string, value: string): Promise<void>;
  appendMemory(namespace: string, key: string, value: string): Promise<string>;
  invokeTool(name: string, args: unknown): Promise<unknown>;
}

export interface NodeImpl {
  readonly type: string;
  readonly label: string;
  readonly inputs: PortDef[];
  readonly outputs: PortDef[];
  readonly params?: Record<string, unknown>;
  readonly hidden?: boolean;
  execute(ctx: ExecCtx, node: NodeDef): Promise<NodeExecutionResult>;
}

export interface PortDef {
  readonly port: string;
  readonly types: string[];
}

export type NodeExecutionResult = Array<{ port: string; payload: PayloadT }>;

const registry = new Map<string, NodeImpl>();

export function registerNode(impl: NodeImpl): void {
  const key = impl.type.trim();
  if (!key) {
    throw new Error("Node type key must be a non-empty string.");
  }
  registry.set(key, impl);
}

export function clearAndRegister(impls: NodeImpl[]): void {
  registry.clear();
  impls.forEach(registerNode);
}

export function listNodes(): NodeImpl[] {
  return Array.from(registry.values()).filter((entry) => entry.hidden !== true);
}

export function getNode(type: string): NodeImpl | undefined {
  return registry.get(type);
}

