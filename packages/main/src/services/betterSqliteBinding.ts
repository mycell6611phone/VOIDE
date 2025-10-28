import fs from "fs";
import path from "path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let hasWarnedMissing = false;
let cachedElectronPath: string | null = null;

function resolveBetterSqlite3Root(): string | null {
  try {
    const pkgPath = require.resolve("better-sqlite3/package.json");
    return path.dirname(pkgPath);
  } catch (error) {
    if (!hasWarnedMissing) {
      hasWarnedMissing = true;
      console.warn("[voide] better-sqlite3 package could not be resolved.");
      if (error instanceof Error) {
        console.warn(error.message);
      }
    }
    return null;
  }
}

function readMetadata(moduleRoot: string): Record<string, unknown> | null {
  const metadataPath = path.join(moduleRoot, "build-electron", "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(metadataPath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    console.warn("[voide] Failed to parse better-sqlite3 Electron metadata.");
    if (error instanceof Error) {
      console.warn(error.message);
    }
    return null;
  }
}

export function resolveElectronBetterSqliteBinary(): string | null {
  if (cachedElectronPath) {
    return cachedElectronPath;
  }
  const root = resolveBetterSqlite3Root();
  if (!root) {
    return null;
  }

  const electronBinary = path.join(root, "build-electron", "Release", "better_sqlite3.node");
  if (fs.existsSync(electronBinary)) {
    const metadata = readMetadata(root);
    const electronVersion = process.versions?.electron;
    if (metadata) {
      const targetPlatform = typeof metadata.platform === "string" ? metadata.platform : null;
      const targetArch = typeof metadata.arch === "string" ? metadata.arch : null;
      const targetVersion = typeof metadata.target === "string" ? metadata.target : null;
      if (targetPlatform && targetPlatform !== process.platform) {
        console.warn(
          `[voide] Electron better-sqlite3 binary targets ${targetPlatform}/${targetArch ?? "?"} but runtime is ${process.platform}/${process.arch}.`
        );
        return null;
      }
      if (targetArch && targetArch !== process.arch) {
        console.warn(
          `[voide] Electron better-sqlite3 binary targets ${targetPlatform ?? "?"}/${targetArch} but runtime is ${process.platform}/${process.arch}.`
        );
        return null;
      }
      if (targetVersion && electronVersion && targetVersion !== electronVersion) {
        console.warn(
          `[voide] Electron better-sqlite3 binary targets Electron ${targetVersion} but runtime is ${electronVersion}.`
        );
        return null;
      }
    }
    cachedElectronPath = electronBinary;
    return electronBinary;
  }

  if (!hasWarnedMissing) {
    hasWarnedMissing = true;
    console.warn(
      `[voide] Electron-specific better-sqlite3 binary not found at ${electronBinary}. ` +
        "Run 'pnpm run native:prepare' to build it."
    );
  }
  return null;
}

export function ensureElectronBetterSqliteBinding(): string | null {
  if (!process.versions?.electron) {
    return null;
  }

  const resolved = resolveElectronBetterSqliteBinary();
  if (!resolved) {
    return null;
  }

  const absolute = path.resolve(resolved);
  if (process.env.BETTER_SQLITE3_PATH === absolute) {
    return absolute;
  }

  process.env.BETTER_SQLITE3_PATH = absolute;
  return absolute;
}


if (process.versions?.electron) {
  ensureElectronBetterSqliteBinding();
}

