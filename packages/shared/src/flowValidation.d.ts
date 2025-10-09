import type { FlowDef } from "./types.js";
export interface FlowValidationError {
    keyword: string;
    instancePath: string;
    schemaPath: string;
    params: Record<string, unknown>;
    message?: string;
    [key: string]: unknown;
}
export interface FlowValidationResult {
    ok: boolean;
    errors: FlowValidationError[];
}
export declare function validateFlowDefinition(flow: FlowDef): FlowValidationResult;
export declare function formatFlowValidationErrors(errors: FlowValidationError[]): string[];
//# sourceMappingURL=flowValidation.d.ts.map