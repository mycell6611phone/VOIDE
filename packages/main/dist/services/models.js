import { createHash } from "crypto";
import fs from "fs";
import * as path from "path";
const LICENSE_ALLOWLIST = new Set([
    "mit",
    "apache-2.0",
    "bsd-2-clause",
    "bsd-3-clause",
    "isc",
]);
function homeDir() {
    return process.env.HOME || process.env.USERPROFILE || ".";
}
function registryPath() {
    const base = path.join(homeDir(), ".voide", "models");
    return path.join(base, "models.json");
}
function getLocalSource(m, regDir) {
    if (!m.url)
        return null;
    if (m.url.startsWith("file://")) {
        const u = new URL(m.url);
        return decodeURIComponent(u.pathname);
    }
    if (/^https?:/i.test(m.url))
        return null;
    if (path.isAbsolute(m.url))
        return m.url;
    return path.join(regDir, m.url);
}
async function fileExists(p) {
    try {
        await fs.promises.access(p);
        return true;
    }
    catch {
        return false;
    }
}
async function sha256File(p) {
    const h = createHash("sha256");
    const f = await fs.promises.open(p, "r");
    try {
        const buf = Buffer.alloc(1 << 20);
        let off = 0;
        while (true) {
            const { bytesRead } = await f.read(buf, 0, buf.length, off);
            if (!bytesRead)
                break;
            h.update(buf.subarray(0, bytesRead));
            off += bytesRead;
        }
    }
    finally {
        await f.close();
    }
    return h.digest("hex");
}
export async function getModelRegistry() {
    const regPath = registryPath();
    const regDir = path.dirname(regPath);
    let data;
    try {
        data = JSON.parse(fs.readFileSync(regPath, "utf-8"));
    }
    catch {
        return { models: [] };
    }
    const arr = Array.isArray(data.models) ? data.models : data;
    const base = path.join(homeDir(), ".voide", "models");
    const out = [];
    for (const m of arr) {
        let status = "unavailable-offline";
        const allowed = !m.license || LICENSE_ALLOWLIST.has(m.license.toLowerCase());
        if (!allowed) {
            status = "blocked-license";
        }
        else {
            const dest = path.join(base, m.id, m.filename);
            if (await fileExists(dest)) {
                try {
                    const hash = await sha256File(dest);
                    if (hash === m.sha256) {
                        status = "installed";
                    }
                    else {
                        status = "available-local";
                    }
                }
                catch {
                    status = "available-local";
                }
            }
            else {
                const src = getLocalSource(m, regDir);
                if (src && await fileExists(src)) {
                    status = "available-local";
                }
                else if (m.url && /^https?:/i.test(m.url)) {
                    status = "unavailable-offline";
                }
            }
        }
        out.push({ ...m, status });
    }
    return { models: out };
}
export async function installModel(id, onProgress) {
    const reg = await getModelRegistry();
    const m = reg.models.find(r => r.id === id);
    if (!m)
        throw new Error(`model ${id} not found`);
    if (m.status === "blocked-license")
        throw new Error("blocked-license");
    const regDir = path.dirname(registryPath());
    const src = getLocalSource(m, regDir);
    if (!src)
        throw new Error("unavailable-offline");
    const total = (await fs.promises.stat(src)).size;
    const base = path.join(homeDir(), ".voide", "models");
    const modelDir = path.join(base, m.id);
    await fs.promises.mkdir(modelDir, { recursive: true });
    const dst = path.join(modelDir, m.filename);
    const partial = dst + ".partial";
    let offset = 0;
    try {
        offset = (await fs.promises.stat(partial)).size;
    }
    catch { }
    const read = fs.createReadStream(src, { start: offset });
    const write = fs.createWriteStream(partial, { flags: offset ? "a" : "w" });
    let loaded = offset;
    onProgress?.({ id, loaded, total });
    await new Promise((resolve, reject) => {
        read.on("data", chunk => {
            loaded += chunk.length;
            onProgress?.({ id, loaded, total });
        });
        read.on("error", reject);
        write.on("error", reject);
        write.on("finish", resolve);
        read.pipe(write);
    });
    const hash = await sha256File(partial);
    if (hash !== m.sha256) {
        await fs.promises.unlink(partial).catch(() => { });
        throw new Error("checksum mismatch");
    }
    await fs.promises.rename(partial, dst);
    await fs.promises.writeFile(path.join(modelDir, `${m.filename}.sha256`), m.sha256 + "\n");
    return dst;
}
