import { globalTypeRegistry, TypeName } from "../runtime/types";

export type TypeRef = TypeName;
export type PortSpec = Record<string, TypeRef>;

export interface ExecuteArgs<I extends PortSpec, C> {
  config: C;
  inputs: { [K in keyof I]: any };
  context: RunnerContext;
  providers?: Record<string, any>;
}

export interface NodeHandler<I extends PortSpec = PortSpec, O extends PortSpec = PortSpec, C = any> {
  kind: string;
  inPorts: I;
  outPorts: O;
  execute(args: ExecuteArgs<I, C>): Promise<{ [K in keyof O]: any }>;
}

export interface RunnerContext {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  log?: (...args: any[]) => void;
}

function sampleValue(type: TypeName): any {
  switch (type) {
    case "UserText":
    case "PromptText":
    case "LLMText":
      return { text: "" };
    case "AnyBlob":
      return { data: new Uint8Array() };
    default:
      if (type.startsWith("ext:")) return { data: new Uint8Array() };
      throw new Error(`Unknown type: ${type}`);
  }
}

export class NodeRegistry {
  private handlers = new Map<string, NodeHandler>();

  register(handler: NodeHandler): void {
    // validate port types
    for (const t of [
      ...Object.values(handler.inPorts),
      ...Object.values(handler.outPorts),
    ]) {
      const sample = sampleValue(t as TypeName);
      globalTypeRegistry.encode(t as TypeName, sample);
    }
    this.handlers.set(handler.kind, handler);
  }

  get(kind: string): NodeHandler {
    const h = this.handlers.get(kind);
    if (!h) throw new Error(`Unknown handler kind: ${kind}`);
    return h;
  }
}

export function makeContext(logger?: (...args: any[]) => void): RunnerContext {
  return {
    inputs: {},
    outputs: {},
    log: logger,
  };
}
