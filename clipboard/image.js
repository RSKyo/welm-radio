import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".tif",
  ".tiff",
  ".gif",
  ".heic",
]);

function assertImageFile(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("image file must be a non-empty string");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`image file not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  if (!IMAGE_EXTS.has(ext)) {
    throw new Error(`unsupported image format: ${ext}`);
  }

  return path.resolve(filePath);
}

function assertOutputPath(outputPath) {
  if (!outputPath || typeof outputPath !== "string") {
    throw new Error("output path must be a non-empty string");
  }

  return path.resolve(outputPath);
}

function assertImageClipboardBin() {
  const imageClipboardBin = path.join(__dirname, "image-clipboard.bin");

  if (!fs.existsSync(imageClipboardBin)) {
    throw new Error(
      `image-clipboard binary not found: ${imageClipboardBin}. Run: npm run compile:image-clipboard`,
    );
  }

  return imageClipboardBin;
}

async function writeClipboardImageDarwin(imagePath) {
  const imageClipboardBin = assertImageClipboardBin();

  try {
    await execFileAsync(imageClipboardBin, ["write", imagePath]);
    return imagePath;
  } catch (error) {
    const message =
      error.stderr?.trim() ||
      error.message ||
      "failed to write image to clipboard";

    throw new Error(`writeClipboardImage failed: ${message}`);
  }
}

async function readClipboardImageDarwin(outputPath) {
  const imageClipboardBin = assertImageClipboardBin();

  try {
    await execFileAsync(imageClipboardBin, ["read", outputPath]);
    return outputPath;
  } catch (error) {
    const message =
      error.stderr?.trim() ||
      error.message ||
      "failed to read image from clipboard";

    throw new Error(`readClipboardImage failed: ${message}`);
  }
}

export async function writeClipboardImage(filePath) {
  const imagePath = assertImageFile(filePath);

  if (process.platform === "darwin") {
    return await writeClipboardImageDarwin(imagePath);
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

export async function readClipboardImage(outputPath) {
  const imagePath = assertOutputPath(outputPath);

  if (process.platform === "darwin") {
    return await readClipboardImageDarwin(imagePath);
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}