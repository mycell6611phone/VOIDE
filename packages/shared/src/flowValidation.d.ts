import type { ErrorObject } from "ajv";
import type { FlowDef } from "./types.js";
export type FlowValidationError = ErrorObject<string, Record<string, unknown>, unknown>;
export interface FlowValidationResult {
    ok: boolean;
    errors: FlowValidationError[];
}
export declare function validateFlowDefinition(flow: FlowDef): FlowValidationResult;
export declare function formatFlowValidationErrors(errors: FlowValidationError[]): string[];
//# sourceMappingURL=flowValidation.d.ts.map