import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  root: rootDir,
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      enabled: false
    }
  },
  resolve: {
    alias: {
      "@voide/renderer": resolve(rootDir, "src")
    }
  }
});

