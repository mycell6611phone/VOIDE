"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelRegistry = getModelRegistry;
const fs_promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function getModelRegistry() {
    const regPath = path_1.default.join(process.cwd(), "models", "models.json");
    try {
        const data = await fs_promises_1.default.readFile(regPath, "utf8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            return {
                models: parsed.map((m) => ({
                    ...m,
                    id: m.id ?? m.md5sum ?? m.sha256sum ?? m.name ?? "",
                    file: m.filename ? path_1.default.join(process.cwd(), "models", m.filename) : ""
                }))
            };
        }
    }
    catch {
        // ignore
    }
    return { models: [] };
}
