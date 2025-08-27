import fs from "fs/promises";
import path from "path";
export async function getModelRegistry() {
    const regPath = path.join(process.cwd(), "models", "models.json");
    try {
        const data = await fs.readFile(regPath, "utf8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            return {
                models: parsed.map((m) => ({
                    ...m,
                    id: m.id ?? m.md5sum ?? m.sha256sum ?? m.name ?? "",
                    file: m.filename ? path.join(process.cwd(), "models", m.filename) : ""
                }))
            };
        }
    }
    catch {
        // ignore
    }
    return { models: [] };
}
