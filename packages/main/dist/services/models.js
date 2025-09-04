"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelRegistry = getModelRegistry;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
// Read the local model registry file and return its contents.
// If the file is missing or invalid, return an empty list of models.
async function getModelRegistry() {
    // Search upwards from the current working directory for a `models/models.json`
    // file. This makes the function resilient to being called from subpackages in
    // the monorepo where the models directory lives at the repository root.
    let dir = process.cwd();
    let regPath = null;
    while (true) {
        const candidate = path_1.default.join(dir, "models", "models.json");
        try {
            await fs_1.promises.access(candidate);
            regPath = candidate;
            break;
        }
        catch {
            const parent = path_1.default.dirname(dir);
            if (parent === dir)
                break; // Reached filesystem root
            dir = parent;
        }
    }
    if (!regPath) {
        return { models: [] };
    }
    try {
        const data = await fs_1.promises.readFile(regPath, "utf8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            const baseDir = path_1.default.dirname(regPath);
            const models = parsed.map((m) => ({
                ...m,
                id: m.id ?? m.md5sum ?? m.sha256sum ?? m.name ?? "",
                file: m.filename ? path_1.default.join(baseDir, m.filename) : ""
            }));
            return { models };
        }
    }
    catch {
        // Ignore errors and fall back to an empty registry.
    }
    return { models: [] };
}
