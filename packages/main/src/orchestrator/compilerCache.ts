import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { Flow as FlowGraph } from "@voide/ipc";
import type { FlowDef, NodeDef, EdgeDef } from "@voide/shared";
import type * as pbTypes from "@voide/core/dist/proto/voide/v1/flow.js";

type CompilerModule = typeof import("@voide/core/dist/build/compiler.js");
type FlowProtoModule = typeof import("@voide/core/dist/proto/voide/v1/flow.js");

const require = createRequire(import.meta.url);

type ModuleNotFoundError = NodeJS.ErrnoException & { code?: "ERR_MODULE_NOT_FOUND" | "MODULE_NOT_FOUND" };

function isModuleNotFoundError(error: unknown): error is ModuleNotFoundError {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND";
}

type ResolvedModule = {
  href: string;
  usedFallback: boolean;
};

async function resolveCoreModule(specifier: string, fallbackRelative: string): Promise<ResolvedModule> {
  try {
    const resolvedPath = require.resolve(specifier);
    return { href: pathToFileURL(resolvedPath).href, usedFallback: false };
  } catch (error) {
    if (!isModuleNotFoundError(error)) {
      throw error;
    }
  }

  const fallbackUrl = new URL(fallbackRelative, import.meta.url);

  try {
    await access(fallbackUrl);
    return { href: fallbackUrl.href, usedFallback: true };
  } catch (fallbackError) {
    const details =
      fallbackError instanceof Error && fallbackError.message ? `: ${fallbackError.message}` : "";
    throw new Error(
      `Unable to resolve \"${specifier}\" or fallback \"${fallbackUrl.href}\"${details}.` +
        " Ensure @voide/core has been built (pnpm --filter @voide/core build).",
      { cause: fallbackError instanceof Error ? fallbackError : undefined },
    );
  }
}

let warnedAboutFallback = false;

async function importFromCore<TModule>(specifier: string, fallbackRelative: string): Promise<TModule> {
  const resolved = await resolveCoreModule(specifier, fallbackRelative);
  const module = (await import(resolved.href)) as TModule;

  if (resolved.usedFallback && !warnedAboutFallback) {
    console.warn(`[orchestrator] Using local fallback for ${specifier} at ${resolved.href}`);
    warnedAboutFallback = true;
  }

  return module;
}

const [compilerModule, flowProtoModule] = await Promise.all([
  importFromCore<CompilerModule>(
    "@voide/core/dist/build/compiler.js",
    "../../../../core/dist/build/compiler.js",
  ),
  importFromCore<FlowProtoModule>(
    "@voide/core/dist/proto/voide/v1/flow.js",
    "../../../../core/dist/proto/voide/v1/flow.js",
  ),
]);

const { compile } = compilerModule;
const pb = flowProtoModule;

export type CompiledFlowEntry = {
  hash: string;
  version: string;
  flow: FlowDef;
  runtimeInputs: Record<string, unknown>;
  bytes: Uint8Array;
  cachedAt: number;
};

type CompileResult = {
  entry: CompiledFlowEntry;
  cached: boolean;
};

const compiledFlows = new Map<string, CompiledFlowEntry>();

function parseParams(json: string): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    console.warn("[orchestrator] Failed to parse node params", error);
    return {};
  }
}

function convertNode(node: pbTypes.Node): NodeDef {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    params: parseParams(node.paramsJson),
    in: node.in.map((port) => ({ port: port.port, types: [...port.types] })),
    out: node.out.map((port) => ({ port: port.port, types: [...port.types] })),
  };
}

function convertEdge(edge: pbTypes.Edge): EdgeDef {
  return {
    id: edge.id,
    from: [edge.from?.node ?? "", edge.from?.port ?? ""],
    to: [edge.to?.node ?? "", edge.to?.port ?? ""],
    label: edge.label || undefined,
  };
}

function fromProto(flow: pbTypes.Flow, runtimeInputs: Record<string, unknown>): FlowDef {
  return {
    id: flow.id,
    version: flow.version,
    nodes: flow.nodes.map(convertNode),
    edges: flow.edges.map(convertEdge),
    runtimeInputs: { ...runtimeInputs },
  };
}

function sanitizeFlow(flow: FlowGraph): FlowGraph {
  const sanitizedNodes = flow.nodes?.map((node) => ({
    ...node,
    params: { ...(node.params ?? {}) },
    in: node.in?.map((port) => ({ port: port.port, types: [...(port.types ?? [])] })) ?? [],
    out: node.out?.map((port) => ({ port: port.port, types: [...(port.types ?? [])] })) ?? [],
  })) ?? [];

  const sanitizedEdges = flow.edges?.map((edge) => ({
    id: edge.id ?? "",
    from: [edge.from[0], edge.from[1]] as [string, string],
    to: [edge.to[0], edge.to[1]] as [string, string],
    label: edge.label,
  })) ?? [];

  return {
    id: flow.id,
    version: flow.version ?? "1.0.0",
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  } as FlowGraph;
}

export function compileAndCache(flow: FlowGraph): CompileResult {
  const runtimeInputs = { ...(flow.runtimeInputs ?? {}) };
  const sanitized = sanitizeFlow(flow);
  const bytes = compile(sanitized as any);
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
  const entry: CompiledFlowEntry = {
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

export function getCompiledFlow(hash: string): CompiledFlowEntry | undefined {
  return compiledFlows.get(hash);
}

export function clearCompiledFlows(): void {
  compiledFlows.clear();
}
