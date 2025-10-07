import path from "node:path";
import { pathToFileURL } from "node:url";

const WORKER_DIST_SEGMENT = `${path.sep}packages${path.sep}workers${path.sep}dist${path.sep}src${path.sep}`;
const ADAPTER_PREFIX = "../../adapters/dist/";

export function resolve(specifier, context, defaultResolve) {
  if (
    specifier.startsWith(ADAPTER_PREFIX) &&
    context.parentURL?.includes(WORKER_DIST_SEGMENT)
  ) {
    const relative = specifier.slice(ADAPTER_PREFIX.length);
    const targetPath = path.resolve("packages/adapters/dist/src", relative);
    return { url: pathToFileURL(targetPath).href, shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}
