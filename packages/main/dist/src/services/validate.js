"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFlow = validateFlow;
const ajv_1 = __importDefault(require("ajv"));
const schemas_1 = require("@voide/schemas");
const ajv = new ajv_1.default({ allErrors: true });
const validate = ajv.compile(schemas_1.flowSchema);
function validateFlow(flow) {
    const ok = validate(flow);
    return { ok, errors: ok ? [] : validate.errors };
}
