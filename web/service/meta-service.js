import nodePath from "node:path";
import fs from "node:fs";
import { readFileJson, writeFileJson } from "welm-cdp/fs";

const audio_types = [
  { value: "voice", label: "人声" },
  { value: "music", label: "音乐" },
  { value: "bed", label: "背景垫乐" },
  { value: "ambience", label: "环境声" },
  { value: "effect", label: "音效" },
  { value: "jingle", label: "标识音" },
  { value: "mixed", label: "混合成品" },
];

const audio_languages = [
  { value: "zh", label: "中文" },
  { value: "en", label: "英文" },
];

const audio_positions = [
  { value: "opening", label: "节目开头" },
  { value: "closing", label: "节目结束" },
  { value: "before_break", label: "插播前" },
  { value: "after_break", label: "插播后" },
  { value: "resume", label: "恢复正文前" },
];

function createDefaultMeta() {
  return {
    "title": "",
    "duration": null, // HH:MM:SS.mmm
    "start": "00:00:00.000", // HH:MM:SS.mmm
    "end": null, // HH:MM:SS.mmm
    "type": "",
    "language": "",
    "content": "",
    "category": [], // 示例：["天气", "新闻", "故事", "段子", "心情", "闲聊", "歌词"]
    "position": "",
    "cutPoints": [], // HH:MM:SS.mmm[]
    "createdAt": "",
    "updatedAt": "",
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

export function loadMeta(metaFilePath) {
  if (!metaFilePath || !fs.existsSync(metaFilePath)) {
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

export function saveMeta(metaFilePath, data = {}) {
  const oldMeta = loadMeta(metaFilePath);
  const now = new Date().toISOString();

  const meta = {
    ...oldMeta,
    ...data,
    createdAt: oldMeta.createdAt === "" ? now : oldMeta.createdAt,
    updatedAt: now,
  };

  writeFileJson(metaFilePath, meta);

  return meta;
}