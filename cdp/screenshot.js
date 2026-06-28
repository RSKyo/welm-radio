import os from "os";
import path from "path";
import fs from "fs/promises";

import { getClient } from "./client.js";

import { copyImage } from "../utils/image.js";

const defaultScreenshotDir = `${process.env.HOME}/.local/share/welm/screenshot`;
const defaultFileName = "screenshot-{yyyy}{MM}{dd}-{HH}{mm}{ss}-{SSS}.png";

/**
 * Validate image file name.
 */
function assertImageFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext !== ".png") {
    throw new Error(`unsupported image file: ${fileName}`);
  }
}

/**
 * Format file name template.
 */
function formatFileName(template, date = new Date()) {
  const pad2 = (v) => String(v).padStart(2, "0");
  const pad3 = (v) => String(v).padStart(3, "0");

  return template
    .replaceAll("{yyyy}", String(date.getFullYear()))
    .replaceAll("{MM}", pad2(date.getMonth() + 1))
    .replaceAll("{dd}", pad2(date.getDate()))
    .replaceAll("{HH}", pad2(date.getHours()))
    .replaceAll("{mm}", pad2(date.getMinutes()))
    .replaceAll("{ss}", pad2(date.getSeconds()))
    .replaceAll("{SSS}", pad3(date.getMilliseconds()));
}

/**
 * Get page layout metrics.
 */
async function getLayoutMetrics(Page) {
  const res = await Page.getLayoutMetrics();

  return {
    layout: {
      viewport: res.layoutViewport ?? null,
      visualViewport: res.visualViewport ?? null,
      contentSize: res.contentSize ?? null,
    },

    css: {
      layoutViewport: res.cssLayoutViewport ?? null,
      visualViewport: res.cssVisualViewport ?? null,
      contentSize: res.cssContentSize ?? null,
    },
  };
}

/**
 * Get full-page screenshot clip region.
 */
async function getFullPageClip(Page) {
  const metrics = await getLayoutMetrics(Page);

  const size = metrics.css.contentSize ?? metrics.layout.contentSize;

  if (!size) {
    throw new Error("failed to get page content size");
  }

  return {
    x: 0,
    y: 0,
    width: Math.ceil(size.width),
    height: Math.ceil(size.height),
  };
}

/**
 * Copy a base64 image to the system clipboard.
 */
async function copyImageBase64(base64, options = {}) {
  const fileName = options.fileName ?? defaultFileName;

  assertImageFileName(fileName);

  const finalFileName = formatFileName(fileName);

  const filePath = path.join(os.tmpdir(), finalFileName);

  try {
    await fs.writeFile(filePath, Buffer.from(base64, "base64"));
    await copyImage(filePath);
  } finally {
    await fs.rm(filePath, {
      force: true,
    });
  }
}

/**
 * Save a base64 image to a file.
 */
async function saveImageBase64(base64, options = {}) {
  const dir = options.dir ?? defaultScreenshotDir;
  const fileName = options.fileName ?? defaultFileName;

  assertImageFileName(fileName);

  const finalDir = path.resolve(dir);
  await fs.mkdir(finalDir, {
    recursive: true,
  });

  const finalFileName = formatFileName(fileName);

  const filePath = path.join(finalDir, finalFileName);

  await fs.writeFile(filePath, Buffer.from(base64, "base64"));

  return filePath;
}

/**
 * Capture a page screenshot.
 *
 * By default, captures the entire page.
 * If clip is provided, captures the specified region.
 *
 * Returns:
 *   Base64-encoded PNG image.
 */
export async function captureScreenshot(targetId, options = {}) {
  const { Page } = await getClient(targetId, options);

  const res = await Page.captureScreenshot({
    format: "png",
    clip: options.clip ?? (await getFullPageClip(Page)),

    fromSurface: true,
    captureBeyondViewport: true,
    optimizeForSpeed: true,
  });

  const base64 = res.data ?? "";

  // copy to clipboard
  if (options.copy) {
    await copyImageBase64(base64, options);
  }

  // save to file
  if (options.save) {
    await saveImageBase64(base64, options);
  }

  return base64;
}
