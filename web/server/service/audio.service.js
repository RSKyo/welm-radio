import nodePath from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { config } from "welm-cdp/common/config";
import { log } from "welm-cdp/common/log";
import {
  scanFilesSync,
  removeFileSync,
  copyFileToSync,
  renameFileSync,
  readFileTextSync,
  readFileBufferSync,
} from "welm-cdp/fs";
import { dialog } from "welm-cdp/dialog";
import {
  assertNonBlankString,
  assertAbsolutePath,
  assertExistingFile,
  assertPlainObject,
} from "welm-cdp/common/assert";

import { loadMeta, saveMeta } from "./meta-service.js";

const execFileAsync = promisify(execFile);

const audio_root_key_path = "radio.audio_root";

const audio_types_key_path = "radio.audio_types";
const audio_languages_key_path = "radio.audio_languages";
const audio_positions_key_path = "radio.audio_positions";

const audio_exts = [".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg"];
const audio_mime_types = {
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
};

const default_audio_types = [
  {
    value: "voice",
    text: "人声",
    description: "以说话内容为主，例如问候、主持、故事、新闻或访谈。",
  },
  {
    value: "music",
    text: "音乐",
    description: "完整或独立播放的音乐内容，例如歌曲、纯音乐或配乐。",
  },
  {
    value: "bed",
    text: "背景垫乐",
    description: "用于人声下方持续铺垫的轻音乐，通常不会单独作为正文播放。",
  },
  {
    value: "ambience",
    text: "环境声",
    description: "营造场景氛围的自然或空间声音，例如雨声、海浪、咖啡馆声。",
  },
  {
    value: "effect",
    text: "音效",
    description: "较短的提示、转场或动作声音，例如铃声、按键声、掌声。",
  },
  {
    value: "jingle",
    text: "标识音",
    description: "用于节目、栏目或品牌识别的短音频，例如台呼、片头标识。",
  },
  {
    value: "mixed",
    text: "混合成品",
    description: "已经混合完成的音频，可能同时包含人声、音乐和音效。",
  },
];

const default_audio_languages = [
  { value: "zh", text: "中文", description: "中文内容" },
  { value: "en", text: "英文", description: "英文内容" },
];

const default_audio_positions = [
  {
    value: "opening",
    text: "节目开头",
    description: "整期节目的开场内容，只播放一次。",
  },
  {
    value: "closing",
    text: "节目结束",
    description: "整期节目的结尾内容，只播放一次。",
  },
  {
    value: "before_break",
    text: "插播前",
    description: "进入广告、提示或其他插播内容前使用。",
  },
  {
    value: "after_break",
    text: "插播后",
    description: "插播内容结束后，用于回到节目。",
  },
  {
    value: "resume",
    text: "恢复正文前",
    description: "中断后重新回到原正文内容前使用。",
  },
  {
    value: "body_intro",
    text: "正文引入",
    description: "某段正文开始前的介绍或引导，例如介绍接下来要听的歌曲。",
  },
  {
    value: "body",
    text: "正文",
    description: "节目中的主要内容，例如音乐、故事、新闻或访谈。",
  },
  {
    value: "body_outro",
    text: "正文收尾",
    description: "某段正文结束后的感想、总结或过渡语。",
  },
];

const default_audio_day_parts = [
  { value: "midnight", text: "午夜", description: "00:00-02:00" },
  { value: "late_night", text: "深夜", description: "02:00-05:00" },
  { value: "dawn", text: "黎明", description: "05:00-06:00" },
  { value: "early_morning", text: "清晨", description: "06:00-08:00" },
  { value: "morning", text: "上午", description: "08:00-10:00" },
  { value: "late_morning", text: "上午晚些时候", description: "10:00-12:00" },
  { value: "noon", text: "中午", description: "12:00-13:00" },
  { value: "early_afternoon", text: "午后", description: "13:00-15:00" },
  { value: "afternoon", text: "下午", description: "15:00-17:00" },
  { value: "evening", text: "傍晚", description: "17:00-19:00" },
  { value: "night", text: "晚间", description: "19:00-22:00" },
  { value: "late_evening", text: "夜晚", description: "22:00-24:00" },
];

let audio_root = config.get(audio_root_key_path);

let audio_types = config.get(audio_types_key_path);
if (!audio_types || !Array.isArray(audio_types) || audio_types.length === 0) {
  audio_types = default_audio_types;
  config.set(audio_types_key_path, audio_types);
}

let audio_languages = config.get(audio_languages_key_path);
if (
  !audio_languages ||
  !Array.isArray(audio_languages) ||
  audio_languages.length === 0
) {
  audio_languages = default_audio_languages;
  config.set(audio_languages_key_path, audio_languages);
}

let audio_positions = config.get(audio_positions_key_path);
if (
  !audio_positions ||
  !Array.isArray(audio_positions) ||
  audio_positions.length === 0
) {
  audio_positions = default_audio_positions;
  config.set(audio_positions_key_path, audio_positions);
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function listAudioTypes() {
  return audio_types;
}

export function listAudioLanguages() {
  return audio_languages;
}

export function listAudioPositions() {
  return audio_positions;
}

export function listAudioDayParts() {
  return default_audio_day_parts;
}

export function listAudioCategories() {
  const audios = listAudios();

  const categories = Array.from(
    new Set(audios.flatMap((audio) => audio.meta?.category || [])),
  ).map((category) => ({ text: category, value: category }));

  return categories;
}

export function listAudioAlternateGroups() {
  const audios = listAudios();

  const groups = Array.from(
    new Set(audios.flatMap((audio) => audio.meta?.alternateGroup || [])),
  ).map((group) => ({ text: group, value: group }));

  return groups;
}

export function listAudios(filters = {}) {
  if (!audio_root || !fs.existsSync(audio_root)) {
    return [];
  }

  const files = scanFiles(audio_root, {
    includeExts: audio_exts,
  });

  let audios = files.map(({ root, dir, base, name, ext, filePath }) => {
    const metaPath = nodePath.join(dir, `${name}.meta.json`);
    const meta = loadMeta(filePath, options);

    return {
      text: base,
      value: filePath,
      root,
      dir,
      base,
      name,
      ext,
      audioPath: filePath,
      metaPath,
      meta,
    };
  });

  return filterAudios(audios, filters);
}

export async function setAudioRoot() {
  const dir = await dialog({
    dialogTitle: "Choose Audio Directory",
    mode: "folder",
  });

  let canceled = false;
  if (dir) {
    config.set(audio_root_key_path, dir);
    audio_root = dir;
  } else {
    canceled = true;
  }

  return {
    dir,
    canceled,
  };
}

export function removeAudios(audioPaths) {
  for (const audioPath of audioPaths) {
    assertExistingFile(audioPath, "filePath");

    removeFileSync(audioPath);

    const dir = nodePath.dirname(audioPath);
    const name = nodePath.basename(audioPath, nodePath.extname(audioPath));
    const metaPath = nodePath.join(dir, `${name}.meta.json`);

    if (fs.existsSync(metaPath)) {
      removeFileSync(metaPath);
    }
  }
}

export async function importAudios() {
  if (!audio_root || !fs.existsSync(audio_root)) {
    throw new Error("Audio directory is not set or does not exist");
  }

  const files = await dialog({
    dialogTitle: "Select Audio Files",
    mode: "files",
    includeExts: audio_exts,
  });

  if (!files || files.length === 0) {
    return {
    audioPaths: [],
    canceled: true,
  };
  }

  for (const filePath of files) {
    assertExistingFile(filePath, "filePath");

    const dir = nodePath.dirname(filePath);
    if (dir === audio_root) {
      continue;
    }
    const fileName = nodePath.basename(filePath);
    const destPath = nodePath.join(audio_root, fileName);

    copyFileToSync(filePath, destPath);
  }


  return {
    audioPaths: files,
    canceled: false,
  };
}

// export async function renameAudio(audioPath, newNameWithoutExt, options = {}) {
//   assertExistingFile(audioPath, "audioPath");
//   assertNonBlankString(newNameWithoutExt, "newNameWithoutExt");

//   const dir = nodePath.dirname(audioPath);
//   const ext = nodePath.extname(audioPath);
//   const audioName = nodePath.basename(audioPath, ext);

//   if (audioName === newNameWithoutExt) {
//     throw new Error("New name is the same as the current name");
//   }

//   const newAudioName = `${newNameWithoutExt}${ext}`;
//   const newAudioPath = nodePath.join(dir, newAudioName);
//   // the second argument is the new name, not the full path
  //  renameFileSync(audioPath, newAudioName);

//   const metaPath = nodePath.join(dir, `${audioName}.meta.json`);
//   const newMetaName = `${newNameWithoutExt}.meta.json`;
//   const newMetaPath = nodePath.join(dir, newMetaName);

//   if (fs.existsSync(metaPath)) {
    //  renameFileSync(metaPath, newMetaName);
//   }

//   // update the audioPath and metaPath in the meta file
//   const meta = await saveMeta(
//     newAudioPath,
//     { audioPath: newAudioPath, metaPath: newMetaPath },
//     options,
//   );

//   const { base, name } = nodePath.parse(newAudioPath);

//   return {
//     base,
//     name,
//     filePath: newAudioPath,
//     metaPath: newMetaPath,
//     meta,
//   };
// }

export async function loadAudio(audioPath) {
  assertExistingFile(audioPath, "audioPath");

  const ext = nodePath.extname(audioPath).toLowerCase();
  const contentType = audio_mime_types[ext] || "application/octet-stream";
  const buffer = readFileBuffer(audioPath);

  return {
    contentType,
    buffer,
  };
}

// -----------------------------------------------------------------------------
// Private Helpers
// -----------------------------------------------------------------------------

function filterAudios(audios, filter) {
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

  // filter by audio day part if specified
  if (filter.dayParts && filter.dayParts.length > 0) {
    audios = audios.filter((audio) => {
      return audio.meta && filter.dayParts.includes(audio.meta.dayPart);
    });
  }

  // filter by audio category if specified
  if (filter.categories && filter.categories.length > 0) {
    audios = audios.filter((audio) => {
      return (
        audio.meta &&
        Array.isArray(audio.meta.category) &&
        audio.meta.category.some((cat) => filter.categories.includes(cat))
      );
    });
  }

  // filter by audio alternate group if specified
  if (filter.alternateGroups && filter.alternateGroups.length > 0) {
    audios = audios.filter((audio) => {
      return (
        audio.meta && filter.alternateGroups.includes(audio.meta.alternateGroup)
      );
    });
  }

  return audios;
}
