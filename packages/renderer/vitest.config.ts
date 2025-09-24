import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  root: rootDir,
  test: {
    environment: "jsdom",
    globals: false,
    include: [
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "src/**/*.test.tsx",
      "src/**/*.spec.tsx"
    ],
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

