import nodePath from "node:path";

import { scanFiles } from "welm-cdp/fs";
import { selectFolder } from "welm-cdp/dialog";
import { config } from "welm-cdp/common/config";
import { log } from "welm-cdp/common/log";
import { assertAbsolutePath } from "welm-cdp/common/assert";

import { loadMeta } from "./meta-service.js";

const audio_library_key_path = "radio.audio_library";
const audio_exts = [".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"];

let audio_dir = config.get(audio_library_key_path);

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function getAudioDir(options = {}) {
  return audio_dir;
}

export function listAudio(filter = {}, options = {}) {
  if (!audio_dir || !nodePath.existsSync(audio_dir)) {
    return [];
  }

  let files = scanFiles(audio_dir, {
    includeExts: audio_exts,
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

  // filter by audio type if specified
  if (filter.types && filter.types.length > 0) {
    files = files.filter((file) => {
      return file.meta && filter.types.includes(file.meta.type);
    });
  }

  return files;
}

export async function selectAudioDir(options = {}) {
  const dir = await selectFolder({
    dialogTitle: "Choose Audio Library",
  });

  log.debug(`Selected Audio Dir: ${dir}`, options);

  if (!dir) {
    return null;
  }

  setAudioDir(dir);

  return dir;
}

// -----------------------------------------------------------------------------
// Private Helpers
// -----------------------------------------------------------------------------

function setAudioDir(dir) {
  assertAbsolutePath(dir, "dir");

  config.set(audio_library_key_path, dir);
  audio_dir = dir;

  return dir;
}