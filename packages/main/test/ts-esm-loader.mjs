import { access, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
  sourceMap: "inline",
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
};

const PACKAGES_ROOT_URL = new URL("../../", import.meta.url);
const MAIN_NODE_MODULES_URL = new URL("../node_modules/", import.meta.url);
const LOADER_FILE_URL = import.meta.url;
const AJV_VIRTUAL_URL = "voide:ajv";

function resolveWorkspaceSpecifier(specifier) {
  if (!specifier.startsWith("@voide/")) {
    return null;
  }
  const remainder = specifier.slice("@voide/".length);
  if (remainder.length === 0) {
    return null;
  }
  const [pkgName, ...parts] = remainder.split("/");
  if (!pkgName) {
    return null;
  }
  const pkgSrcUrl = new URL(`${pkgName}/src/`, PACKAGES_ROOT_URL);
  let subpath = parts.join("/");
  if (!subpath) {
    subpath = "index.ts";
  } else if (!subpath.endsWith(".ts") && !subpath.endsWith(".mts") && !subpath.endsWith(".cts") && !subpath.endsWith(".js")) {
    subpath = `${subpath}.ts`;
  }
  return new URL(subpath, pkgSrcUrl).href;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier === "ajv") {
    return { shortCircuit: true, url: AJV_VIRTUAL_URL };
  }
  if (specifier === "protobufjs/minimal.js") {
    const pbUrl = new URL("protobufjs/minimal.js", MAIN_NODE_MODULES_URL);
    return { shortCircuit: true, url: pbUrl.href };
  }
  const workspaceUrl = resolveWorkspaceSpecifier(specifier);
  if (workspaceUrl) {
    return { shortCircuit: true, url: workspaceUrl };
  }
  if (specifier.endsWith(".ts")) {
    const parent = context.parentURL ? new URL(specifier, context.parentURL) : pathToFileURL(specifier);
    return { shortCircuit: true, url: parent.href };
  }
  if (specifier.endsWith(".js") && context.parentURL && context.parentURL.startsWith("file:")) {
    const candidate = new URL(specifier.replace(/\.js$/, ".ts"), context.parentURL);
    try {
      await access(candidate);
      return { shortCircuit: true, url: candidate.href };
    } catch {
      // fall through to default resolution
    }
  }
  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (url.endsWith(".ts")) {
    const fileUrl = new URL(url);
    const sourceBuffer = await readFile(fileUrl);
    const source = sourceBuffer.toString("utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: COMPILER_OPTIONS,
      fileName: fileUrl.pathname,
    });
    return {
      format: "module",
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }
  if (url === AJV_VIRTUAL_URL) {
    const source = `import { createRequire } from "node:module";\n` +
      `const require = createRequire(${JSON.stringify(LOADER_FILE_URL)});\n` +
      `const ajvModule = require(${JSON.stringify(new URL("ajv/dist/ajv.js", MAIN_NODE_MODULES_URL).pathname)});\n` +
      `const Ajv = ajvModule.default ?? ajvModule;\n` +
      `export default Ajv;\n`;
    return {
      format: "module",
      source,
      shortCircuit: true,
    };
  }
  return defaultLoad(url, context, defaultLoad);
}
