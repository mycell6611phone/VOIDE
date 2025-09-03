// packages/main/services/models.ts
import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import crypto from "crypto";
import fetch from "node-fetch";
import { BrowserWindow, dialog } from "electron";

const streamPipeline = promisify(pipeline);

// Default storage path
export const MODELS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".voide",
  "models"
);

export interface ModelDef {
  name: string;
  filename: string;
  url: string;
  md5sum?: string;
  sha256sum?: string;
  filesize?: string;
}

/**
 * Ensure a model file exists locally. If not, download from URL and verify checksum.
 */
export async function ensureModel(
  model: ModelDef,
  win?: BrowserWindow
): Promise<string> {
  const targetPath = path.join(MODELS_DIR, model.filename);

  // Already exists?
  if (fs.existsSync(targetPath)) {
    if (await verifyChecksum(targetPath, model)) {
      return targetPath;
    } else {
      fs.unlinkSync(targetPath); // bad file
    }
  }

  // Confirm with user
  const sizeMsg = model.filesize
    ? ` (~${Math.round(parseInt(model.filesize) / (1024 * 1024 * 1024))} GB)`
    : "";
  const res = dialog.showMessageBoxSync(win!, {
    type: "question",
    buttons: ["Download", "Cancel"],
    message: `Model ${model.name} is missing. Download now?${sizeMsg}`,
  });
  if (res !== 0) throw new Error("Download cancelled by user");

  // Ensure target dir
  fs.mkdirSync(MODELS_DIR, { recursive: true });

  // Download
  const response = await fetch(model.url);
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);

  await streamPipeline(response.body, fs.createWriteStream(targetPath));

  // Verify
  if (!(await verifyChecksum(targetPath, model))) {
    throw new Error("Checksum verification failed");
  }

  return targetPath;
}

/**
 * Verify MD5 or SHA256 checksum if provided in models.json
 */
async function verifyChecksum(filePath: string, model: ModelDef): Promise<boolean> {
  if (!model.md5sum && !model.sha256sum) return true;

  const buf = fs.readFileSync(filePath);
  if (model.md5sum) {
    const md5 = crypto.createHash("md5").update(buf).digest("hex");
    if (md5 !== model.md5sum) return false;
  }
  if (model.sha256sum) {
    const sha = crypto.createHash("sha256").update(buf).digest("hex");
    if (sha !== model.sha256sum) return false;
  }
  return true;
}

