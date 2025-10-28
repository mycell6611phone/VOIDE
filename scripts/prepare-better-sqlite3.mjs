#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import https from "node:https";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.VOIDE_SKIP_NATIVE_PREPARE === "1") {
  console.log("[voide] Skipping native module preparation because VOIDE_SKIP_NATIVE_PREPARE=1.");
  process.exit(0);
}

function readPackageJSON(pkgPath) {
  const content = fs.readFileSync(pkgPath, "utf8");
  return JSON.parse(content);
}

function normalizeVersion(version) {
  if (!version || typeof version !== "string") {
    throw new Error(`Invalid Electron version specifier: ${version}`);
  }
  const match = version.match(/\d+\.\d+\.\d+/);
  if (!match) {
    throw new Error(`Unable to parse Electron version from: ${version}`);
  }
  return match[0];
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const MAX_REDIRECTS = 5;

function downloadToFile(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const { statusCode, headers } = response;
      if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
        if (redirects >= MAX_REDIRECTS) {
          response.resume();
          reject(new Error(`Too many redirects while downloading ${url}`));
          return;
        }
        const redirectUrl = new URL(headers.location, url).toString();
        response.resume();
        downloadToFile(redirectUrl, destination, redirects + 1).then(resolve, reject);
        return;
      }
      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed for ${url} (status ${statusCode})`));
        return;
      }
      const fileStream = fs.createWriteStream(destination);
      response.pipe(fileStream);
      fileStream.on("finish", () => fileStream.close(resolve));
      fileStream.on("error", (error) => {
        fs.rmSync(destination, { force: true });
        reject(error);
      });
    });
    request.on("error", (error) => {
      fs.rmSync(destination, { force: true });
      reject(error);
    });
  });
}

async function downloadPrebuilt(url, targetDir) {
  console.log(`[voide] Downloading Electron prebuilt from ${url}`);
  const tempFile = path.join(os.tmpdir(), `voide-better-sqlite3-${process.pid}-${Date.now()}.tar.gz`);
  try {
    await downloadToFile(url, tempFile);
  } catch (error) {
    const errorCode = error && typeof error === "object" && "code" in error ? error.code : null;
    if (errorCode === "ENETUNREACH" || errorCode === "EAI_AGAIN") {
      console.warn(
        `[voide] HTTPS download failed (${errorCode}). Falling back to 'curl -L'.`
      );
      const curlResult = spawnSync("curl", ["-L", "-o", tempFile, url], { stdio: "inherit" });
      if (curlResult.status !== 0) {
        fs.rmSync(tempFile, { force: true });
        throw new Error(`curl failed with exit code ${curlResult.status ?? 1}`);
      }
    } else {
      throw error;
    }
  }
  ensureDir(targetDir);
  const extract = spawnSync(
    "tar",
    ["-xzf", tempFile, "-C", targetDir, "--strip-components=2", "build/Release/better_sqlite3.node"],
    { stdio: "inherit" }
  );
  fs.rmSync(tempFile, { force: true });
  if (extract.status !== 0) {
    throw new Error(`tar exited with code ${extract.status ?? 1}`);
  }
}

async function main() {
  const workspacePackage = readPackageJSON(path.join(__dirname, "..", "package.json"));
  const electronVersion = normalizeVersion(
    workspacePackage.devDependencies?.electron ?? workspacePackage.dependencies?.electron
  );

  const require = createRequire(import.meta.url);
  const resolutionHints = [
    path.join(__dirname, ".."),
    path.join(__dirname, "..", "packages", "main"),
    path.join(__dirname, "..", "core"),
    path.join(__dirname, "..", "node_modules", ".pnpm", "node_modules"),
  ];

  let betterSqlite3PackagePath;
  for (const hint of resolutionHints) {
    try {
      betterSqlite3PackagePath = require.resolve("better-sqlite3/package.json", { paths: [hint] });
      break;
    } catch (error) {
      betterSqlite3PackagePath = undefined;
    }
  }
  if (!betterSqlite3PackagePath) {
    throw new Error("Unable to locate better-sqlite3 package. Ensure dependencies are installed.");
  }

  const moduleRoot = path.dirname(betterSqlite3PackagePath);
  const betterSqlitePackage = readPackageJSON(betterSqlite3PackagePath);
  const betterSqliteVersion = betterSqlitePackage.version;

  let nodeAbiModule;
  for (const hint of resolutionHints) {
    try {
      const resolved = require.resolve("node-abi", { paths: [hint] });
      nodeAbiModule = require(resolved);
      break;
    } catch (error) {
      nodeAbiModule = undefined;
    }
  }
  if (!nodeAbiModule) {
    throw new Error("Unable to resolve node-abi module required for Electron ABI detection.");
  }

  const electronAbi = nodeAbiModule.getAbi(electronVersion, "electron");

  const buildReleasePath = path.join(moduleRoot, "build", "Release");
  const releaseBinaryPath = path.join(buildReleasePath, "better_sqlite3.node");
  const fallbackNodeBinaryPath = path.join(moduleRoot, "build-node", "Release", "better_sqlite3.node");

  if (!fs.existsSync(releaseBinaryPath)) {
    if (fs.existsSync(fallbackNodeBinaryPath)) {
      ensureDir(buildReleasePath);
      fs.copyFileSync(fallbackNodeBinaryPath, releaseBinaryPath);
    } else {
      throw new Error("better-sqlite3 Node binary is missing. Run `pnpm install` first.");
    }
  }

  const backupDir = path.join(moduleRoot, "build-node", "Release");
  ensureDir(backupDir);
  const backupBinaryPath = path.join(backupDir, "better_sqlite3.node");
  fs.copyFileSync(releaseBinaryPath, backupBinaryPath);

  const electronDir = path.join(moduleRoot, "build-electron", "Release");
  const electronBinaryPath = path.join(electronDir, "better_sqlite3.node");
  const metadataPath = path.join(moduleRoot, "build-electron", "metadata.json");

  let metadata = null;
  if (fs.existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    } catch (error) {
      console.warn("[voide] Failed to parse existing better-sqlite3 metadata. Re-downloading...");
    }
  }

  if (
    metadata &&
    metadata.target === electronVersion &&
    metadata.arch === process.arch &&
    metadata.platform === process.platform &&
    metadata.abi === electronAbi &&
    fs.existsSync(electronBinaryPath)
  ) {
    console.log(
      `[voide] better-sqlite3 Electron binary already prepared for Electron ${electronVersion} (${process.platform}/${process.arch}).`
    );
    return;
  }

  const downloadFileName = `better-sqlite3-v${betterSqliteVersion}-electron-v${electronAbi}-${process.platform}-${process.arch}.tar.gz`;
  const downloadUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${betterSqliteVersion}/${downloadFileName}`;

  // Clean up any stale file before extracting a fresh build.
  fs.rmSync(electronBinaryPath, { force: true });
  await downloadPrebuilt(downloadUrl, electronDir);

  fs.writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        target: electronVersion,
        arch: process.arch,
        platform: process.platform,
        runtime: "electron",
        abi: electronAbi,
        downloadUrl,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  // Restore the Node build to the default location for CLI usage.
  fs.copyFileSync(backupBinaryPath, releaseBinaryPath);

  console.log("[voide] better-sqlite3 Electron binary prepared successfully.");
}

main().catch((error) => {
  console.error("[voide] Failed to prepare better-sqlite3 Electron binary.");
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
