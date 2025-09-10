import type { FlowDef } from "@voide/shared";
export declare function validateFlow(flow: FlowDef): {
    ok: boolean;
    errors: import("ajv").ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
};
