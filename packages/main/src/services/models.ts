import { promises as fs } from "fs";
import path from "path";

export interface ModelInfo {
  id: string;
  file: string;
  [key: string]: any;
}

// Read the local model registry file and return its contents.
// If the file is missing or invalid, return an empty list of models.
export async function getModelRegistry(): Promise<{ models: ModelInfo[] }> {
  const regPath = path.join(process.cwd(), "models", "models.json");
  try {
    const data = await fs.readFile(regPath, "utf8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const models: ModelInfo[] = parsed.map((m: any) => ({
        ...m,
        id: m.id ?? m.md5sum ?? m.sha256sum ?? m.name ?? "",
        file: m.filename ? path.join(process.cwd(), "models", m.filename) : ""
      }));
      return { models };
    }
  } catch {
    // Ignore errors and fall back to an empty registry.
  }
  return { models: [] };
}
