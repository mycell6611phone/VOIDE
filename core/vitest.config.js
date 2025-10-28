import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const rootDir = fileURLToPath(new URL("./", import.meta.url));
export default defineConfig({
    root: rootDir,
    test: {
        environment: "node",
    },
    resolve: {
        alias: {
            "@voide/shared": resolve(rootDir, "../packages/shared/src"),
        },
    },
});
