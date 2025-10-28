import { validateFlowDefinition } from "@voide/shared/flowValidation";
export function validateFlow(flow) {
    return validateFlowDefinition(flow);
}
