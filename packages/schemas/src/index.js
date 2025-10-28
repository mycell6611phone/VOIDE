// packages/schemas/src/index.ts
// Import the JSON schema using import attributes for Node ESM compatibility
import flowSchema from "../../../flows/schema/flow.schema.json" with { type: "json" };
// Re-export so other packages can consume it
export { flowSchema };
