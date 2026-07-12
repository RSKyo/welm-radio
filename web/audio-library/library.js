import nodePath from "node:path";

import { scanFiles } from "welm-cdp/fs";
import { selectFolder } from "welm-cdp/dialog";

import { config } from "../../infra/config.js";
import { log } from "../../infra/log.js";
import { loadMeta } from "./meta.js";

const AUDIO_LIBRARY_DIR_KEY = "welm-radio.audio_library";

const AUDIO_EXTS = [".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"];

export function getRoot() {
  return config.get(AUDIO_LIBRARY_DIR_KEY);
}

export function setRoot(dir) {
  config.set(AUDIO_LIBRARY_DIR_KEY, dir);

  return dir;
}

export function listAudio(filter = {}, options = {}) {
  const root = getRoot();

  if (!root) {
    return [];
  }

  let files = scanFiles(root, {
    includeExts: AUDIO_EXTS,
  });

  files = files.map(({ root, dir, base, ext, name, filePath }) => {
    const metaPath = nodePath.join(dir, `${name}.meta.json`);
    const meta = loadMeta(metaPath);

    return {
      root,
      dir,
      base,
      ext,
      name,
      filePath,
      metaPath,
      meta,
    };
  });

  if (filter.types.length > 0) {
    files = files.filter((file) => {
      return file.meta && filter.types.includes(file.meta.type);
    });
  }

  return files;
}

export async function selectRoot(options = {}) {
  const root = await selectFolder({
    dialogTitle: "Choose Audio Library",
  });

  log.debug(`Selected Root: ${root}`, options);

  if (!root) {
    return null;
  }

  setRoot(root);

  return root;
}
