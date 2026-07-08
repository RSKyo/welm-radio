import { joinPath, scanFiles } from "welm-cdp/fs";
import { selectFolder } from "welm-cdp/dialog";

import { config } from "../../infra/config.js";
import { loadMeta } from "./meta.js";

const AUDIO_LIBRARY_DIR_KEY = "radio.audio_library";

const AUDIO_EXTS = [".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"];

// -----------------------------------------------------------------------------
// root
// -----------------------------------------------------------------------------

export function getRoot() {
  return config.get(AUDIO_LIBRARY_DIR_KEY);
}

export function setRoot(dir) {
  config.set(AUDIO_LIBRARY_DIR_KEY, dir);

  return dir;
}

// -----------------------------------------------------------------------------
// scan
// -----------------------------------------------------------------------------

export function listAudio() {
  const root = getRoot();

  if (!root) {
    return [];
  }

  const files = scanFiles(root, {
    includeExts: AUDIO_EXTS,
  });

  return files.map(({ root, dir, base, ext, name, filePath }) => {
    const metaPath = joinPath(dir, `${name}.meta.json`);
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
}

export function selectRoot() {
  const root = selectFolder({
    dialogTitle: "Choose Audio Library",
  });

  if (!root) {
    return null;
  }

  setRoot(root);

  return root;
}