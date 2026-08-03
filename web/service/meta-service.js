import nodePath from "node:path";
import {
  readFileJson,
  writeFileJson,
  renameFile,
  fileExists,
} from "welm-cdp/fs";
import { assertPlainObject, assertAbsolutePath } from "welm-cdp/common/assert";

function createDefaultMeta() {
  return {
    description: "",
    alternateGroup: "", // 同一组音频的不同版本，使用相同的 alternateGroup 值来关联
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
