import Ajv from "ajv";
import { flowSchema } from "@voide/schemas";
import type { FlowDef } from "@voide/shared";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(flowSchema as any);

export function validateFlow(flow: FlowDef) {
  const ok = validate(flow);
  return { ok, errors: ok ? [] : validate.errors };
}
