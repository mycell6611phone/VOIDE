"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretsService = getSecretsService;
const keytar_1 = __importDefault(require("keytar"));
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Secrets {
    filePath;
    constructor() {
        const dir = path_1.default.join(process.env.HOME || process.cwd(), ".voide");
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        this.filePath = path_1.default.join(dir, "secrets.bin");
    }
    async set(scope, key, value) {
        try {
            await keytar_1.default.setPassword(`voide:${scope}`, key, value);
            return { ok: true, backend: "keytar" };
        }
        catch {
            const blob = electron_1.safeStorage.isEncryptionAvailable() ? electron_1.safeStorage.encryptString(value) : Buffer.from(value, "utf8");
            fs_1.default.writeFileSync(this.k(scope, key), blob);
            return { ok: true, backend: "safeStorage" };
        }
    }
    async get(scope, key) {
        try {
            const v = await keytar_1.default.getPassword(`voide:${scope}`, key);
            if (v)
                return { value: v };
        }
        catch { /* fallthrough */ }
        try {
            const blob = fs_1.default.readFileSync(this.k(scope, key));
            const v = electron_1.safeStorage.isEncryptionAvailable() ? electron_1.safeStorage.decryptString(blob) : blob.toString("utf8");
            return { value: v };
        }
        catch {
            return { value: null };
        }
    }
    k(scope, key) { return `${this.filePath}.${scope}.${key}`; }
}
let svc = null;
function getSecretsService() { if (!svc)
    svc = new Secrets(); return svc; }
