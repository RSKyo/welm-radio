import nodePath from "node:path";
import fs from "node:fs";

import { scanFiles, removeFile, fileExists } from "welm-cdp/fs";
import { selectFolder } from "welm-cdp/dialog";
import { config } from "welm-cdp/common/config";
import { log } from "welm-cdp/common/log";
import { assertAbsolutePath, assertExistingFile } from "welm-cdp/common/assert";

import { loadMeta } from "./meta-service.js";

const audio_library_key_path = "radio.audio_library";
const audio_exts = [".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"];

let audio_dir = config.get(audio_library_key_path);

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

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

export function listCategory(options = {}) {
  const audios = listAudio({}, options);

  const categories = Array.from(
    new Set(audios.flatMap((audio) => audio.meta?.category || [])),
  ).map((category) => ({ text: category, value: category }));

  return categories;
}

export function listAudio(filter = {}, options = {}) {
  if (!audio_dir || !fs.existsSync(audio_dir)) {
    return [];
  }

  const files = scanFiles(audio_dir, {
    includeExts: audio_exts,
  });

  let audios = files.map(({ root, dir, base, ext, name, filePath }) => {
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
    audios = audios.filter((audio) => {
      return audio.meta && filter.types.includes(audio.meta.type);
    });
  }

  // filter by audio language if specified
  if (filter.languages && filter.languages.length > 0) {
    audios = audios.filter((audio) => {
      return audio.meta && filter.languages.includes(audio.meta.language);
    });
  }

  // filter by audio position if specified
  if (filter.positions && filter.positions.length > 0) {
    audios = audios.filter((audio) => {
      return audio.meta && filter.positions.includes(audio.meta.position);
    });
  }

  if (filter.categories && filter.categories.length > 0) {
    audios = audios.filter((audio) => {
      return (
        audio.meta &&
        Array.isArray(audio.meta.category) &&
        audio.meta.category.some((cat) => filter.categories.includes(cat))
      );
    });
  }

  return audios;
}

export async function removeAudio(files, options = {}) {
  for (const filePath of files) {
    assertExistingFile(filePath, "filePath");

    removeFile(filePath);

    const dir = nodePath.dirname(filePath);
    const name = nodePath.basename(filePath, nodePath.extname(filePath));
    const metaPath = nodePath.join(dir, `${name}.meta.json`);

    if (metaPath && fileExists(metaPath)) {
      removeFile(metaPath);
    }
  }
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
