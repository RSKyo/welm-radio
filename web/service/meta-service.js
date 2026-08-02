import nodePath from "node:path";
import {
  readFileJson,
  writeFileJson,
  renameFile,
  fileExists,
} from "welm-cdp/fs";
import { assertPlainObject, assertAbsolutePath } from "welm-cdp/common/assert";

const audio_types = [
  { value: "voice", text: "人声" },
  { value: "music", text: "音乐" },
  { value: "bed", text: "背景垫乐" },
  { value: "ambience", text: "环境声" },
  { value: "effect", text: "音效" },
  { value: "jingle", text: "标识音" },
  { value: "mixed", text: "混合成品" },
];

const audio_languages = [
  { value: "zh", text: "中文" },
  { value: "en", text: "英文" },
];

const audio_positions = [
  { value: "opening", text: "节目开头" },
  { value: "closing", text: "节目结束" },
  { value: "before_break", text: "插播前" },
  { value: "after_break", text: "插播后" },
  { value: "resume", text: "恢复正文前" },
  { value: "body", text: "正文" },
];

function createDefaultMeta() {

  return {
    description: "",
    duration: null, // HH:MM:SS.mmm
    start: "00:00:00.000", // HH:MM:SS.mmm
    end: null, // HH:MM:SS.mmm
    type: "",
    language: "",
    content: "",
    category: [], // 示例：["天气", "新闻", "故事", "段子", "心情", "闲聊", "歌词"]
    position: "",
    cutPoints: [], // HH:MM:SS.mmm[]
    createdAt: "",
    updatedAt: "",
  };
}

export function listAudioType() {
  return audio_types;
}

export function listAudioLanguage() {
  return audio_languages;
}

export function listAudioPosition() {
  return audio_positions;
}

export function loadMeta(metaFilePath, options = {}) {
  if (!metaFilePath || !fileExists(metaFilePath)) {
    return createDefaultMeta();
  }

  try {
    return {
      ...createDefaultMeta(),
      ...readFileJson(metaFilePath),
    };
  } catch {
    return createDefaultMeta();
  }
}

export function saveMeta(filePath, meta = {}, options = {}) {
  const oldMeta = loadMeta(filePath);
  const now = new Date().toISOString();

  const newMeta = {
    ...oldMeta,
    ...meta,
    createdAt: oldMeta.createdAt === "" ? now : oldMeta.createdAt,
    updatedAt: now,
  };

  writeFileJson(filePath, newMeta, { overwrite: true, spaces: 2 });

  return newMeta;
}
