"use strict";
// packages/schemas/src/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowSchema = void 0;
// Import the JSON schema without `assert { type: "json" }`
// This requires `"resolveJsonModule": true` in tsconfig.json
const flow_schema_json_1 = __importDefault(require("../../../flows/schema/flow.schema.json"));
exports.flowSchema = flow_schema_json_1.default;
