export type PortDir = "in" | "out";
export interface PortSpec {
    port: string;
    types: string[];
}
export interface NodeSpec {
    id: string;
    type: string;
    in: PortSpec[];
    out: PortSpec[];
}
export interface EdgeSpec {
    from: [string, string];
    to: [string, string];
}
export interface Canvas {
    nodes: NodeSpec[];
    edges: EdgeSpec[];
}
export type BuildErrorCode = "E-CYCLE" | "E-TYPE" | "E-CONFIG" | "E-DANGLING" | "E-UNREACHABLE-OUTPUT";
export declare class BuildError extends Error {
    code: BuildErrorCode;
    node?: string | undefined;
    port?: string | undefined;
    constructor(code: BuildErrorCode, message: string, node?: string | undefined, port?: string | undefined);
}
export declare function validateMenus(canvas: Canvas): void;
export declare function validateDangling(canvas: Canvas): void;
export declare function validateTypes(canvas: Canvas): void;
export declare function validateAcyclic(canvas: Canvas): void;
export declare function validateReachableOutputs(canvas: Canvas): void;
export declare function validateCanvas(canvas: Canvas): void;
export declare function getPort(node: NodeSpec, dir: PortDir, port: string): PortSpec | undefined;
