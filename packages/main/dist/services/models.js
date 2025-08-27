"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelRegistry = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
async function getModelRegistry() {
    const regPath = path_1.default.join(process.cwd(), "models", "models.json");
    try {
        const data = await fs_1.promises.readFile(regPath, "utf8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            const models = parsed.map((m) => ({
                ...m,
                id: m.id ?? m.md5sum ?? m.sha256sum ?? m.name ?? "",
                file: m.filename ? path_1.default.join(process.cwd(), "models", m.filename) : ""
            }));
            return { models };
        }
    }
    catch {
        // ignore
    }
    return { models: [] };
}
exports.getModelRegistry = getModelRegistry;
