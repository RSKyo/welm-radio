import { joinPath, scanPath } from "welm-cdp/file";
import { config } from "../../../infra/config.js";
import { loadMeta } from "./meta.js";

const audio_library_dir_key = "radio.audio_library";
const audioExts = [".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"];

export function getAudioLibraryDir() {
  return config.get(audio_library_dir_key);
}

export function setAudioLibraryDir(dir) {
  config.set(audio_library_dir_key, dir);
  return true;
}

export function listAudio() {
  const dir = getAudioLibraryDir();

  if (!dir) {
    return [];
  }

  return scanPath(dir, {
    includeExts: audioExts,
  }).map(({ name, filePath }) => {
    const metaPath = joinPath(dir, `${name}.meta.json`);
    const meta = loadMeta(metaPath);

    return {
      filePath,
      ...meta,
    };
  });
}
