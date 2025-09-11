import keytar from "keytar";
import { safeStorage } from "electron";
import fs from "fs";
import path from "path";
class Secrets {
    filePath;
    constructor() {
        const dir = path.join(process.env.HOME || process.cwd(), ".voide");
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        this.filePath = path.join(dir, "secrets.bin");
    }
    async set(scope, key, value) {
        try {
            await keytar.setPassword(`voide:${scope}`, key, value);
            return { ok: true, backend: "keytar" };
        }
        catch {
            const blob = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(value) : Buffer.from(value, "utf8");
            fs.writeFileSync(this.k(scope, key), blob);
            return { ok: true, backend: "safeStorage" };
        }
    }
    async get(scope, key) {
        try {
            const v = await keytar.getPassword(`voide:${scope}`, key);
            if (v)
                return { value: v };
        }
        catch { /* fallthrough */ }
        try {
            const blob = fs.readFileSync(this.k(scope, key));
            const v = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(blob) : blob.toString("utf8");
            return { value: v };
        }
        catch {
            return { value: null };
        }
    }
    k(scope, key) { return `${this.filePath}.${scope}.${key}`; }
}
let svc = null;
export function getSecretsService() { if (!svc)
    svc = new Secrets(); return svc; }
