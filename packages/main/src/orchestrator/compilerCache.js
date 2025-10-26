import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
function isModuleNotFoundError(error) {
    if (typeof error !== "object" || error === null || !("code" in error)) {
        return false;
    }
    const code = error.code;
    return code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND";
}
async function resolveCoreModule(specifier, fallbackRelative) {
    try {
        const resolvedPath = require.resolve(specifier);
        return { href: pathToFileURL(resolvedPath).href, usedFallback: false };
    }
    catch (error) {
        if (!isModuleNotFoundError(error)) {
            throw error;
        }
    }
    const fallbackUrl = new URL(fallbackRelative, import.meta.url);
    try {
        await access(fallbackUrl);
        return { href: fallbackUrl.href, usedFallback: true };
    }
    catch (fallbackError) {
        const details = fallbackError instanceof Error && fallbackError.message ? `: ${fallbackError.message}` : "";
        throw new Error(`Unable to resolve \"${specifier}\" or fallback \"${fallbackUrl.href}\"${details}.` +
            " Ensure @voide/core has been built (pnpm --filter @voide/core build).", { cause: fallbackError instanceof Error ? fallbackError : undefined });
    }
}
let warnedAboutFallback = false;
async function importFromCore(specifier, fallbackRelative) {
    const resolved = await resolveCoreModule(specifier, fallbackRelative);
    const module = (await import(resolved.href));
    if (resolved.usedFallback && !warnedAboutFallback) {
        console.warn(`[orchestrator] Using local fallback for ${specifier} at ${resolved.href}`);
        warnedAboutFallback = true;
    }
    return module;
}
const [compilerModule, flowProtoModule] = await Promise.all([
    importFromCore("@voide/core/dist/build/compiler.js", "../../../../core/dist/build/compiler.js"),
    importFromCore("@voide/core/dist/proto/voide/v1/flow.js", "../../../../core/dist/proto/voide/v1/flow.js"),
]);
const { compile } = compilerModule;
const pb = flowProtoModule;
const compiledFlows = new Map();
function parseParams(json) {
    if (!json)
        return {};
    try {
        const parsed = JSON.parse(json);
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch (error) {
        console.warn("[orchestrator] Failed to parse node params", error);
        return {};
    }
}
function convertNode(node) {
    return {
        id: node.id,
        type: node.type,
        name: node.name,
        params: parseParams(node.paramsJson),
        in: node.in.map((port) => ({ port: port.port, types: [...port.types] })),
        out: node.out.map((port) => ({ port: port.port, types: [...port.types] })),
    };
}
function convertEdge(edge) {
    return {
        id: edge.id,
        from: [edge.from?.node ?? "", edge.from?.port ?? ""],
        to: [edge.to?.node ?? "", edge.to?.port ?? ""],
        label: edge.label || undefined,
    };
}
function fromProto(flow, runtimeInputs) {
    return {
        id: flow.id,
        version: flow.version,
        nodes: flow.nodes.map(convertNode),
        edges: flow.edges.map(convertEdge),
        runtimeInputs: { ...runtimeInputs },
    };
}
function sanitizeFlow(flow) {
    const sanitizedNodes = flow.nodes?.map((node) => ({
        ...node,
        params: { ...(node.params ?? {}) },
        in: node.in?.map((port) => ({ port: port.port, types: [...(port.types ?? [])] })) ?? [],
        out: node.out?.map((port) => ({ port: port.port, types: [...(port.types ?? [])] })) ?? [],
    })) ?? [];
    const sanitizedEdges = flow.edges?.map((edge) => ({
        id: edge.id ?? "",
        from: [edge.from[0], edge.from[1]],
        to: [edge.to[0], edge.to[1]],
        label: edge.label,
    })) ?? [];
    return {
        id: flow.id,
        version: flow.version ?? "1.0.0",
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
    };
}
export function compileAndCache(flow) {
    const runtimeInputs = { ...(flow.runtimeInputs ?? {}) };
    const sanitized = sanitizeFlow(flow);
    const bytes = compile(sanitized);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const existing = compiledFlows.get(hash);
    if (existing) {
        existing.runtimeInputs = { ...runtimeInputs };
        existing.flow = {
            ...existing.flow,
            runtimeInputs: { ...runtimeInputs },
        };
        return { entry: existing, cached: true };
    }
    const proto = pb.Flow.decode(bytes);
    const flowDef = fromProto(proto, runtimeInputs);
    const version = proto.version && proto.version.length > 0 ? proto.version : "1.0.0";
    const entry = {
        hash,
        version,
        flow: flowDef,
        runtimeInputs: { ...runtimeInputs },
        bytes,
        cachedAt: Date.now(),
    };
    compiledFlows.set(hash, entry);
    return { entry, cached: false };
}
export function getCompiledFlow(hash) {
    return compiledFlows.get(hash);
}
export function clearCompiledFlows() {
    compiledFlows.clear();
}
