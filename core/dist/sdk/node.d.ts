import { TypeName } from "../runtime/types.js";
export type TypeRef = TypeName;
export type PortSpec = Record<string, TypeRef>;
export interface ExecuteArgs<I extends PortSpec, C> {
    config: C;
    inputs: {
        [K in keyof I]: any;
    };
    context: RunnerContext;
    providers?: Record<string, any>;
}
export interface NodeHandler<I extends PortSpec = PortSpec, O extends PortSpec = PortSpec, C = any> {
    kind: string;
    inPorts: I;
    outPorts: O;
    execute(args: ExecuteArgs<I, C>): Promise<{
        [K in keyof O]: any;
    }>;
}
export interface RunnerContext {
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    log?: (...args: any[]) => void;
}
export declare class NodeRegistry {
    private handlers;
    register(handler: NodeHandler): void;
    get(kind: string): NodeHandler;
}
export declare function makeContext(logger?: (...args: any[]) => void): RunnerContext;
