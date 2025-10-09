import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const rootDir = fileURLToPath(new URL("./", import.meta.url));
export default defineConfig({
    // Running Vitest from the package folder keeps module resolution identical to how the package is consumed.
    root: rootDir,
    test: {
        environment: "node",
        include: ["test/**/*.spec.ts"],
        // We keep globals disabled so schema tests use the explicit Vitest imports just like the TypeScript compiler.
        globals: false,
    },
    resolve: {
        alias: {
            // Point the package name at the source entry so the tests exercise the TypeScript definition rather than stale build output.
            "@voide/ipc": resolve(rootDir, "src/index.ts"),
        },
    },
});
