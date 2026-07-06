import { joinPath, scanPath } from "welm-cdp/file";

import { config } from "../../infra/config.js";
import { loadMeta } from "./meta.js";

const AUDIO_LIBRARY_DIR_KEY = "radio.audio_library";

const AUDIO_EXTS = [".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"];

// // root
// getRoot()
// setRoot()

// // folder
// listFolders()
// createFolder()
// renameFolder()
// moveFolder()
// deleteFolder()

// // audio
// list()
// get()
// rename()
// move()
// copy()
// remove()

// // meta
// getMeta()
// saveMeta()
// ensureMeta()
// removeMeta()

// // search
// search()
// findByTag()

// // statistics
// stats()
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

  const files = scanPath(root, {
    includeExts: AUDIO_EXTS,
  });

  return files.map(({ name, filePath }) => {
    const metaPath = joinPath(root, `${name}.meta.json`);
    const meta = loadMeta(metaPath);

      return {
        filePath,
        meta,
      };
  });
}
