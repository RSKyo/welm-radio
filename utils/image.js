import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import path from "path";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const copyImageSource = path.resolve(__dirname, "./copy-image.swift");

const copyImageBin = path.resolve(__dirname, "./copy-image");

async function ensureCopyImageBin() {
  if (fs.existsSync(copyImageBin)) {
    return;
  }

  if (!fs.existsSync(copyImageSource)) {
    throw new Error("copy-image.swift not found");
  }

  await execFileAsync("swiftc", [copyImageSource, "-o", copyImageBin]);
}

export async function copyImage(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`file not found: ${filePath}`);
  }

  const fileExt = path.extname(filePath).toLowerCase();

  if (![".png", ".jpg", ".jpeg", ".webp"].includes(fileExt)) {
    throw new Error(`unsupported image format: ${fileExt}`);
  }

  await ensureCopyImageBin();

  await execFileAsync(copyImageBin, [filePath]);

  return true;
}
