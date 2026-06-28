import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { ERROR_CODE, createError } from "../infra/error.js";

// -----------------------------------------------------------------------------
// private
// -----------------------------------------------------------------------------

function normalizeList(value) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((v) => String(v).split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function matchExt(file, exts) {
  if (!exts.length) {
    return true;
  }

  const fileExt = path.extname(file).toLowerCase();

  return exts.some((ext) => {
    ext = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;

    return ext === fileExt;
  });
}

function isExcluded(file, excludes) {
  if (!excludes.length) {
    return false;
  }

  const name = path.basename(file);

  return excludes.some((pattern) => {
    // *.tmp
    // *.bak
    if (pattern.startsWith("*.")) {
      return name.endsWith(pattern.slice(1));
    }

    // .git
    // node_modules
    return name === pattern;
  });
}

function isHidden(file) {
  return path.basename(file).startsWith(".");
}

function readFile(file) {

  return fs.readFileSync(file);
}

async function writeFile(file, data) {

  if (data == null) {
    throw createError(ERROR_CODE.INVALID, "missing data");
  }

  await ensureDir(path.dirname(file));

  await fsp.writeFile(file, data);

  return file;
}

// -----------------------------------------------------------------------------
// path
// -----------------------------------------------------------------------------

/**
 * 判断路径是否存在。
 *
 * input:
 *   文件或目录路径
 */
export function exists(input) {

  return fs.existsSync(input);
}

/**
 * 判断路径是否为文件。
 *
 * file:
 *   文件路径
 */
export function isFile(file) {

  return fs.existsSync(file) && fs.statSync(file).isFile();
}

/**
 * 判断路径是否为目录。
 *
 * dir:
 *   目录路径
 */
export function isDirectory(dir) {

  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

// -----------------------------------------------------------------------------
// dir
// -----------------------------------------------------------------------------

/**
 * 确保目录存在。
 *
 * dir:
 *   目录路径
 *
 * 目录不存在时自动创建。
 */
export async function ensureDir(dir) {

  await fsp.mkdir(dir, {
    recursive: true,
  });

  return dir;
}

// -----------------------------------------------------------------------------
// list
// -----------------------------------------------------------------------------

/**
 * 获取文件列表。
 *
 * input:
 *   文件或目录
 *
 * options:
 *   ext:
 *     扩展名过滤。
 *
 *     支持：
 *       .ass
 *       ass
 *       .ass,.srt
 *       [".ass", ".srt"]
 *
 *   exclude:
 *     排除规则。
 *
 *     支持：
 *       .git
 *       node_modules
 *       *.tmp
 *       *.bak
 *       .git,node_modules
 *
 *   recursive:
 *     是否递归目录，默认 true
 *
 *   hidden:
 *     是否包含隐藏文件，默认 false
 *
 * 返回：
 *   文件绝对路径数组
 */
export function getFiles(input, options = {}) {

  const { recursive = true, hidden = false } = options;

  const exts = normalizeList(options.ext);
  const excludes = normalizeList(options.exclude);

  const target = path.resolve(input);

  if (!exists(target)) {
    throw createError(ERROR_CODE.NOT_FOUND, `path not found: ${input}`);
  }

  if (!hidden && isHidden(target)) {
    return [];
  }

  if (isFile(target)) {
    if (matchExt(target, exts) && !isExcluded(target, excludes)) {
      return [target];
    }

    return [];
  }

  const files = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const file = path.join(dir, entry.name);

      if (!hidden && isHidden(file)) {
        continue;
      }

      if (isExcluded(file, excludes)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (recursive) {
          walk(file);
        }

        continue;
      }

      if (matchExt(file, exts)) {
        files.push(file);
      }
    }
  };

  walk(target);

  return files;
}

// -----------------------------------------------------------------------------
// text
// -----------------------------------------------------------------------------

/**
 * 读取文本文件。
 *
 * file:
 *   文本文件路径
 *
 * 返回：
 *   UTF-8 字符串
 */
export function readText(file) {
  return readFile(file).toString("utf8");
}

/**
 * 写入文本文件。
 *
 * file:
 *   输出文件路径
 *
 * text:
 *   文本内容
 *
 * 自动创建父目录。
 */
export async function writeText(file, text) {
  return writeFile(file, String(text));
}

// -----------------------------------------------------------------------------
// json
// -----------------------------------------------------------------------------

/**
 * 读取 JSON 文件。
 *
 * file:
 *   JSON 文件路径
 *
 * 返回：
 *   JSON 对象
 */
export function readJson(file) {
  return JSON.parse(readText(file));
}

/**
 * 写入 JSON 文件。
 *
 * file:
 *   输出文件路径
 *
 * value:
 *   JSON 对象
 *
 * options:
 *   spaces:
 *     JSON 缩进空格数，默认 2
 *
 * 自动创建父目录。
 */
export async function writeJson(file, value, options = {}) {
  const { spaces = 2 } = options;

  let text;

  try {
    text = `${JSON.stringify(value, null, spaces)}\n`;
  } catch {
    throw createError(ERROR_CODE.INVALID, "invalid json");
  }

  return writeText(file, text);
}

// -----------------------------------------------------------------------------
// buffer
// -----------------------------------------------------------------------------

/**
 * 读取二进制文件。
 *
 * file:
 *   文件路径
 *
 * 返回：
 *   Buffer
 */
export function readBuffer(file) {
  return readFile(file);
}

/**
 * 写入二进制文件。
 *
 * file:
 *   输出文件路径
 *
 * buffer:
 *   Buffer 或 Uint8Array
 *
 * 自动创建父目录。
 */
export async function writeBuffer(file, buffer) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    throw createError(ERROR_CODE.INVALID, "invalid buffer");
  }

  return writeFile(file, buffer);
}

// -----------------------------------------------------------------------------
// base64
// -----------------------------------------------------------------------------

/**
 * 读取文件并转换为 Base64。
 *
 * file:
 *   文件路径
 *
 * 返回：
 *   Base64 字符串
 */
export function readBase64(file) {
  return readBuffer(file).toString("base64");
}

/**
 * 将 Base64 写入文件。
 *
 * file:
 *   输出文件路径
 *
 * base64:
 *   Base64 字符串
 *
 * 支持：
 *   data:image/png;base64,...
 *
 * 自动创建父目录。
 */
export async function writeBase64(file, base64) {
  if (typeof base64 !== "string") {
    throw createError(ERROR_CODE.INVALID, "invalid base64");
  }

  const clean = base64.replace(/^data:.*;base64,/, "");

  return writeFile(file, Buffer.from(clean, "base64"));
}
