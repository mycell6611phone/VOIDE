// packages/schemas/src/index.ts

// Import the JSON schema without `assert { type: "json" }`
// This requires `"resolveJsonModule": true` in tsconfig.json
import flowSchema from "../../../flows/schema/flow.schema.json";

// Re-export so other packages can consume it
export { flowSchema };

