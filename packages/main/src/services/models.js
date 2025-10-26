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
function normalizeIdCandidate(value) {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    return trimmed;
}
function slugifyId(value) {
    const withoutExt = value.replace(/\.[^.]+$/g, "");
    return withoutExt
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
function ensureUniqueId(candidate, seen) {
    let id = candidate;
    let counter = 1;
    while (seen.has(id)) {
        counter += 1;
        id = `${candidate}-${counter}`;
    }
    seen.add(id);
    return id;
}
function deriveRegistryId(entry, index, seen) {
    const existing = normalizeIdCandidate(entry.id);
    if (existing) {
        return ensureUniqueId(existing, seen);
    }
    const candidateFields = [
        entry.modelId,
        entry.model_id,
        entry.filename,
        entry.file,
        entry.name,
        entry.order,
        entry.md5sum,
        entry.sha256,
        entry.sha256sum,
    ];
    for (const candidate of candidateFields) {
        if (typeof candidate !== "string") {
            continue;
        }
        const normalized = slugifyId(candidate.trim());
        if (!normalized) {
            continue;
        }
        const prefixed = normalized.startsWith("model:") ? normalized : `model:${normalized}`;
        return ensureUniqueId(prefixed, seen);
    }
    return ensureUniqueId(`model:auto-${index + 1}`, seen);
}
function normalizeRegistryEntry(entry, index, regDir, seen) {
    const clone = { ...entry };
    const id = deriveRegistryId(clone, index, seen);
    let filename = typeof clone.filename === "string" ? clone.filename.trim() : "";
    if (!filename && typeof clone.file === "string" && clone.file.trim()) {
        filename = path.basename(clone.file.trim());
    }
    const backend = typeof clone.backend === "string" && clone.backend.trim()
        ? clone.backend.trim()
        : "llamacpp";
    let filePath = null;
    if (typeof clone.file === "string" && clone.file.trim()) {
        const raw = clone.file.trim();
        filePath = path.isAbsolute(raw) ? raw : path.resolve(regDir, raw);
    }
    const name = typeof clone.name === "string" ? clone.name : id;
    let sha256 = null;
    const rawSha256 = clone["sha256"];
    const rawSha256Sum = clone["sha256sum"];
    const rawMd5Sum = clone["md5sum"];
    if (typeof rawSha256 === "string" && rawSha256.trim()) {
        sha256 = rawSha256.trim();
    }
    else if (typeof rawSha256Sum === "string" && rawSha256Sum.trim()) {
        sha256 = rawSha256Sum.trim();
    }
    else if (typeof rawMd5Sum === "string" && rawMd5Sum.trim()) {
        sha256 = rawMd5Sum.trim();
    }
    if (!sha256) {
        sha256 = "";
    }
    const sizeRaw = clone.sizeBytes;
    const sizeBytes = typeof sizeRaw === "number" && Number.isFinite(sizeRaw)
        ? sizeRaw
        : typeof sizeRaw === "string"
            ? Number(sizeRaw)
            : 0;
    const normalized = {
        id,
        name,
        backend,
        filename,
        sha256,
        sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
        license: typeof clone.license === "string" ? clone.license : undefined,
        url: typeof clone.url === "string" ? clone.url : undefined,
        file: filePath,
    };
    return normalized;
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
    const arrRaw = Array.isArray(data.models) ? data.models : data;
    const base = path.join(homeDir(), ".voide", "models");
    const seenIds = new Set();
    const normalizedEntries = arrRaw.map((entry, index) => normalizeRegistryEntry(entry, index, regDir, seenIds));
    const out = [];
    for (const m of normalizedEntries) {
        let status = "unavailable-offline";
        let resolvedFile = typeof m.file === "string" ? m.file : null;
        const allowed = !m.license || LICENSE_ALLOWLIST.has(m.license.toLowerCase());
        if (!allowed) {
            status = "blocked-license";
        }
        else {
            const filename = typeof m.filename === "string" && m.filename.trim() ? m.filename : "";
            const dest = filename ? path.join(base, m.id, filename) : null;
            if (dest && (await fileExists(dest))) {
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
                resolvedFile = dest;
            }
            else {
                const src = getLocalSource(m, regDir);
                if (src && await fileExists(src)) {
                    status = "available-local";
                    resolvedFile = path.resolve(src);
                }
                else if (m.url && /^https?:/i.test(m.url)) {
                    status = "unavailable-offline";
                }
            }
        }
        if (resolvedFile && !(await fileExists(resolvedFile))) {
            resolvedFile = null;
        }
        out.push({ ...m, status, file: resolvedFile });
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
