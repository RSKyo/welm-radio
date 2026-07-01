import fs from "node:fs";
import path from "node:path";

import { config } from "../../infra/config.js";

function getRoot() {
  return config.get("radio.root");
}

export function setRoot(root) {
  config.set("radio.root", root);
  return true;
}

function isAudioFile(file) {
  return /\.(mp3|flac|wav|m4a|aac|ogg)$/i.test(file);
}

function scanAudio(root) {
  if (!root || !fs.existsSync(root)) {
    return [];
  }

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((item) => item.isFile())
    .filter((item) => isAudioFile(item.name))
    .map((item) => {
      const fullPath = path.join(root, item.name);

      return {
        file: item.name,
        fullPath,
      };
    });
}

function loadMeta(root, file) {
  const parsed = path.parse(file);
  const metaPath = path.join(root, `${parsed.name}.meta.json`);

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch {
    return null;
  }
}

export function getAudioList() {
  const root = getRoot();

  if (!root) {
    return [];
  }

  const list = scanAudio(root).map((item) => {
    const meta = loadMeta(root, item.file);

    return {
      file: item.file,
      fullPath: item.fullPath,
      meta,
      tags: meta?.tags ?? [],
    };
  });

  list.sort((a, b) => {
    if (!a.meta && b.meta) return -1;
    if (a.meta && !b.meta) return 1;
    return a.file.localeCompare(b.file);
  });

  return list;
}
