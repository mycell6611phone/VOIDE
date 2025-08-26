import Ajv from "ajv";
import { flowSchema } from "@voide/schemas";
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(flowSchema);
export function validateFlow(flow) {
    const ok = validate(flow);
    return { ok, errors: ok ? [] : validate.errors };
}
