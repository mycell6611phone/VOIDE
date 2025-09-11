import type { FlowDef } from "@voide/shared";
export declare function runFlow(flow: FlowDef): Promise<{
    runId: string;
}>;
export declare function stopFlow(runId: string): Promise<{
    ok: boolean;
}>;
export declare function stepFlow(_runId: string): Promise<{
    ok: boolean;
}>;
export declare function getLastRunPayloads(runId: string): Promise<{
    nodeId: any;
    port: any;
    payload: any;
}[]>;
export declare function getNodeCatalog(): {
    type: string;
    in: {
        port: string;
        types: string[];
    }[];
    out: {
        port: string;
        types: string[];
    }[];
}[];
