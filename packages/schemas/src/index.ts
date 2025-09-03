import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const flowSchema = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../flows/schema/flow.schema.json"),
    "utf-8"
  )
);

// Re-export the JSON schema and related TypeScript types
export { flowSchema };
export type {
  FlowDef,
  NodeDef,
  EdgeDef,
  PortDef,
  NodeKind,
  LLMConfig,
  MemoryConfig,
  EdgeType,
  GraphMeta,
  RunSettings
} from "@voide/shared";

