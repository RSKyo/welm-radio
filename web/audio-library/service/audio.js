import path from "node:path";

import { config } from "../../../infra/config.js";
import { scanFiles } from "./file.js";
import { loadMeta } from "./meta.js";

const audioExts = [".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"];

export function getAudioLibraryDir() {
  return config.get("radio.audio_library");
}

export function setAudioLibraryDir(dir) {
  config.set("radio.audio_library", dir);
  return true;
}

export function getAudioList() {
  const dir = getAudioLibraryDir();

  if (!dir) {
    return [];
  }

  return scanFiles(dir, {
    includeExts: audioExts,
  }).map(({ base, name, dir, path: filePath }) => {
    const metaPath = path.join(dir, `${name}.meta.json`);
    const meta = loadMeta(metaPath);

    return {
      base,
      path: filePath,
      metaPath,
      ...meta,
    };
  });
}
