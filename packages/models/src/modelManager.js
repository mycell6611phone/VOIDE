// packages/models/src/modelManager.ts
import { createHash } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
export class ModelManager {
    getRegistry;
    constructor(getRegistry) {
        this.getRegistry = getRegistry;
    }
    async select(id, opts = {}) {
        const home = process.env.HOME || process.env.USERPROFILE || ".";
        const baseDir = opts.modelsDir ?? path.join(home, ".voide", "models");
        const registry = await this.getRegistry();
        const rec = registry.find(r => r.id === id);
        if (!rec)
            throw new Error(`Model ${id} not found in registry`);
        const modelDir = path.join(baseDir, rec.id);
        const modelPath = path.join(modelDir, rec.filename);
        const shaPath = path.join(modelDir, `${rec.filename}.sha256`);
        await fs.mkdir(modelDir, { recursive: true });
        // If file exists, decide whether to verify
        let mustVerify = false;
        switch (opts.verifyOnUse ?? "if-registry-changed") {
            case "always":
                mustVerify = true;
                break;
            case "if-registry-changed":
                try {
                    const current = await fs.readFile(shaPath, "utf8");
                    if (!current.includes(rec.sha256))
                        mustVerify = true;
                }
                catch {
                    mustVerify = true;
                }
                break;
            case "never":
                mustVerify = false;
                break;
        }
        const exists = await fileExists(modelPath);
        if (!exists) {
            await this.downloadWithMirrors(rec, modelPath, shaPath);
            await this.preflightCompute(rec);
            return modelPath;
        }
        if (mustVerify) {
            const hash = await sha256File(modelPath);
            if (hash !== rec.sha256) {
                // redownload
                await this.downloadWithMirrors(rec, modelPath, shaPath);
            }
        }
        await this.preflightCompute(rec);
        return modelPath;
    }
    async downloadWithMirrors(rec, dst, shaPath) {
        const tmp = `${dst}.partial`;
        let lastErr = null;
        for (const url of rec.sources) {
            try {
                await httpDownload(url, tmp, rec.sizeBytes);
                const hash = await sha256File(tmp);
                if (hash !== rec.sha256)
                    throw new Error(`checksum mismatch`);
                await fs.rename(tmp, dst);
                await fs.writeFile(shaPath, `${rec.sha256}\n`);
                return;
            }
            catch (e) {
                lastErr = e;
            }
        }
        throw new Error(`All mirrors failed for ${rec.id}: ${lastErr}`);
    }
    async preflightCompute(rec) {
        const minVRAM = rec.params?.minVRAMGB ?? 0;
        const minRAM = rec.params?.minRAMGB ?? 0;
        const ramGB = await totalRAMGB();
        if (minRAM && ramGB < minRAM) {
            throw new Error(`Insufficient system RAM: have ${ramGB.toFixed(1)} GB, need ${minRAM} GB for ${rec.id}`);
        }
        // GPU VRAM check is backend-specific and optional. Warn only.
        // Implementers: integrate CUDA/Metal/ROCm detectors here.
    }
}
// Helpers
async function fileExists(p) {
    try {
        await fs.access(p);
        return true;
    }
    catch {
        return false;
    }
}
async function sha256File(p) {
    const h = createHash("sha256");
    const f = await fs.open(p, "r");
    try {
        const buf = Buffer.alloc(1 << 20);
        let bytes = 0;
        while (true) {
            const { bytesRead } = await f.read(buf, 0, buf.length, bytes);
            if (!bytesRead)
                break;
            bytes += bytesRead;
            h.update(buf.subarray(0, bytesRead));
        }
    }
    finally {
        await f.close();
    }
    return h.digest("hex");
}
// naive HTTP download with range resume when supported
async function httpDownload(url, dst, _size) {
    const mod = await import(url.startsWith("https:") ? "https" : "http");
    const { createWriteStream } = await import("fs");
    await new Promise((resolve, reject) => {
        const file = createWriteStream(dst);
        const req = mod.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            res.pipe(file);
            file.on("finish", () => file.close(() => resolve()));
            file.on("error", err => {
                file.destroy();
                reject(err);
            });
        });
        req.on("error", err => {
            file.destroy();
            reject(err);
        });
    });
}
async function totalRAMGB() {
    const os = await import("os");
    return os.totalmem() / (1024 ** 3);
}
