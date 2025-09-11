import Ajv from "ajv";
import { flowSchema } from "@voide/schemas";
const AjvCtor = Ajv;
const ajv = new AjvCtor({ allErrors: true });
const validate = ajv.compile(flowSchema);
export function validateFlow(flow) {
    const ok = validate(flow);
    return { ok, errors: ok ? [] : validate.errors };
}
