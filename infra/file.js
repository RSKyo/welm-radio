// -----------------------------------------------------------------------------
// file
// -----------------------------------------------------------------------------
// General-purpose local file utility module.
//
// Public API:
// - scanPath(input, options)
// - readFileText(filePath, options)
// - writeFileText(filePath, text, options)
// - readFileJson(filePath, options)
// - writeFileJson(filePath, value, options)
// - readFileBuffer(filePath)
// - writeFileBuffer(filePath, buffer)
// - readFileBase64(filePath)
// - writeFileBase64(filePath, base64)
//
// scanPath options:
// - includeExts: include only specific extensions, e.g. [".mp3", ".flac"]
// - excludeExts: exclude specific extensions, e.g. [".jpg", ".png"]
// - includeHidden: include hidden files and directories, default false
//
// Design:
// - All methods are synchronous.
// - Parent directories are created automatically before writing files.
// - scanPath accepts either a file path or a directory path.
// - scanPath skips hidden files and hidden directories by default.
// - JSON files are written with 2-space indentation and a final newline by default.
// - Public read/write methods stay flat and do not call each other.
// - Public read/write methods call the internal readFile / writeFile helpers.
//
// Version: 0.2.0
// Last modified: 2026-07-04
// -----------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

// #region Public API

// -----------------------------------------------------------------------------
// Scan files and directories
// -----------------------------------------------------------------------------

export function scanPath(input, options = {}) {
  if (!input || !fs.existsSync(input)) {
    return [];
  }

  options = normalizeScanOptions(options);

  if (!options.includeHidden && isHiddenPath(input)) {
    return [];
  }

  const stat = fs.statSync(input);

  if (stat.isDirectory()) {
    return scanDir(input, options);
  }

  if (stat.isFile()) {
    if (!matchFile(input, options)) {
      return [];
    }

    return [createFileEntry(input)];
  }

  return [];
}

// -----------------------------------------------------------------------------
// Text read/write
// -----------------------------------------------------------------------------

export function readFileText(filePath, options = {}) {
  const { encoding = "utf8" } = options;

  return readFile(filePath).toString(encoding);
}

export function writeFileText(filePath, text, options = {}) {
  const { encoding = "utf8" } = options;

  return writeFile(filePath, String(text), { encoding });
}

// -----------------------------------------------------------------------------
// JSON read/write
// -----------------------------------------------------------------------------

export function readFileJson(filePath, options = {}) {
  const { encoding = "utf8" } = options;

  const text = readFile(filePath).toString(encoding);

  return JSON.parse(stripBom(text));
}

export function writeFileJson(filePath, value, options = {}) {
  const { spaces = 2, finalNewline = true, encoding = "utf8" } = options;

  let text = JSON.stringify(value, null, spaces);

  if (typeof text !== "string") {
    throw new Error("invalid json");
  }

  if (finalNewline) {
    text += "\n";
  }

  return writeFile(filePath, text, { encoding });
}

// -----------------------------------------------------------------------------
// Buffer read/write
// -----------------------------------------------------------------------------

export function readFileBuffer(filePath) {
  return readFile(filePath);
}

export function writeFileBuffer(filePath, buffer) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    throw new Error("invalid buffer");
  }

  return writeFile(filePath, buffer);
}

// -----------------------------------------------------------------------------
// Base64 read/write
// -----------------------------------------------------------------------------

export function readFileBase64(filePath) {
  return readFile(filePath).toString("base64");
}

export function writeFileBase64(filePath, base64) {
  const clean = normalizeBase64(base64);

  return writeFile(filePath, Buffer.from(clean, "base64"));
}

// #endregion

// #region Private helpers

// -----------------------------------------------------------------------------
// Scan helpers
// -----------------------------------------------------------------------------

function scanDir(dir, options = {}) {
  if (!dir || !fs.existsSync(dir)) {
    return [];
  }

  const result = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (!options.includeHidden && isHiddenName(item.name)) {
      continue;
    }

    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      result.push(...scanDir(fullPath, options));
      continue;
    }

    if (!item.isFile()) {
      continue;
    }

    if (!matchFile(fullPath, options)) {
      continue;
    }

    result.push(createFileEntry(fullPath));
  }

  return result;
}

function normalizeScanOptions(options = {}) {
  return {
    ...options,
    includeHidden: options.includeHidden === true,
    includeExts: normalizeExts(options.includeExts),
    excludeExts: normalizeExts(options.excludeExts),
  };
}

function normalizeExts(exts) {
  if (!exts) {
    return null;
  }

  return exts.map((ext) => {
    ext = ext.toLowerCase();
    return ext.startsWith(".") ? ext : `.${ext}`;
  });
}

function isHiddenPath(filePath) {
  return isHiddenName(path.basename(filePath));
}

function isHiddenName(name) {
  return name.startsWith(".");
}

function matchFile(filePath, options = {}) {
  const ext = path.extname(filePath).toLowerCase();

  if (options.includeExts && !options.includeExts.includes(ext)) {
    return false;
  }

  if (options.excludeExts && options.excludeExts.includes(ext)) {
    return false;
  }

  return true;
}

function createFileEntry(filePath) {
  const parsed = path.parse(filePath);

  /**
   * Full file path.
   *
   * Returned object shape:
   * {
   *   root: "/",                            // Root path
   *   dir: "/Users/xxx/Music",              // Parent directory
   *   base: "song.mp3",                     // File name with extension
   *   ext: ".mp3",                          // File extension, including the dot
   *   name: "song",                         // File name without extension
   *   path: "/Users/xxx/Music/song.mp3"     // Full file path
   * }
   */
  return {
    ...parsed,
    path: filePath,
  };
}

// -----------------------------------------------------------------------------
// Read/Write helpers
// -----------------------------------------------------------------------------

function assertFilePath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    throw new Error("invalid file path");
  }
}

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);

  if (!dir || dir === ".") {
    return;
  }

  fs.mkdirSync(dir, { recursive: true });
}

function readFile(filePath) {
  assertFilePath(filePath);

  return fs.readFileSync(filePath);
}

function writeFile(filePath, data, options) {
  assertFilePath(filePath);
  ensureParentDir(filePath);

  fs.writeFileSync(filePath, data, options);

  return true;
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function normalizeBase64(base64) {
  if (typeof base64 !== "string") {
    throw new Error("invalid base64");
  }

  const clean = base64.replace(/^data:[^,]*;base64,/, "").replace(/\s+/g, "");

  if (clean.length % 4 === 1) {
    throw new Error("invalid base64");
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
    throw new Error("invalid base64");
  }

  return clean;
}

// #endregion
