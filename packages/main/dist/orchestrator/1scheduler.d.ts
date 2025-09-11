import type { FlowDef } from "@voide/shared";
export declare class Frontier {
    private ready;
    constructor(initial: string[]);
    hasReady(): boolean;
    nextReady(): string;
    add(n: string): void;
}
export declare function topoOrder(flow: FlowDef): string[];
export declare function downstream(flow: FlowDef, nodeId: string): string[];
