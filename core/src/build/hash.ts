import { createHash } from "crypto";

export function hashCompiledFlow(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
