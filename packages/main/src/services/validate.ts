import type { FlowDef } from "@voide/shared";
import { validateFlowDefinition } from "@voide/shared/flowValidation";

export function validateFlow(flow: FlowDef) {
  return validateFlowDefinition(flow);
}
