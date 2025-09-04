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
  // Search upwards from the current working directory for a `models/models.json`
  // file. This makes the function resilient to being called from subpackages in
  // the monorepo where the models directory lives at the repository root.
  let dir = process.cwd();
  let regPath: string | null = null;
  while (true) {
    const candidate = path.join(dir, "models", "models.json");
    try {
      await fs.access(candidate);
      regPath = candidate;
      break;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break; // Reached filesystem root
      dir = parent;
    }
  }

  if (!regPath) {
    return { models: [] };
  }

  try {
    const data = await fs.readFile(regPath, "utf8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const baseDir = path.dirname(regPath);
      const models: ModelInfo[] = parsed.map((m: any) => ({
        ...m,
        id: m.id ?? m.md5sum ?? m.sha256sum ?? m.name ?? "",
        file: m.filename ? path.join(baseDir, m.filename) : ""
      }));
      return { models };
    }
  } catch {
    // Ignore errors and fall back to an empty registry.
  }
  return { models: [] };
}
