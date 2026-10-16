import nodePath from "node:path";
import fs from "node:fs";

import { readFileJsonSync, writeFileJsonSync } from "welm-cdp/fs";
import {
  assertPlainObject,
  assertAbsolutePath,
  assertNonNegative,
} from "welm-cdp/infra/assert";

function createDefaultMeta(options = {}) {
  return {
    audioPath: options.audioPath ?? "", // 音频文件的绝对路径
    metaPath: options.metaPath ?? "", // 元数据文件的绝对路径
    title: "", // 音频标题
    extension: "", // 音频文件的扩展名，例如 .mp3、.flac、.wav 等
    language: "zh",
    type: "",
    position: "",
    dayPart: [],
    category: [], // 示例：["天气", "新闻", "故事", "段子", "心情", "闲聊", "歌词"]
    cutPoints: [], // HH:MM:SS.mmm[]
    content: "",
    alternateGroup: "", // 同一组音频的不同版本，使用相同的 alternateGroup 值来关联
    duration: 0,
    start: 0,
    end: 0,
    createdAt: "",
    updatedAt: "",
  };
}

export function getMetaPath(audioPath) {
  const { dir, name } = nodePath.parse(audioPath);
  return nodePath.join(dir, `${name}.meta.json`);
}

export function loadMeta(audioPath) {
  const metaPath = getMetaPath(audioPath);

  if (!metaPath || !fs.existsSync(metaPath)) {
    return createDefaultMeta({ audioPath, metaPath });
  }

  try {
    return {
      ...createDefaultMeta({ audioPath, metaPath }),
      ...readFileJsonSync(metaPath),
    };
  } catch {
    return createDefaultMeta({ audioPath, metaPath });
  }
}

export function saveMeta(audioPath, meta = {}) {
  const metaPath = getMetaPath(audioPath);

  const oldMeta = loadMeta(audioPath);
  const now = new Date().toISOString();

  const newMeta = {
    ...oldMeta,
    ...meta,
    createdAt: oldMeta.createdAt === "" ? now : oldMeta.createdAt,
    updatedAt: now,
  };

  assertNonNegative(newMeta.duration, "meta.duration");
  assertNonNegative(newMeta.start, "meta.start");
  assertNonNegative(newMeta.end, "meta.end");
  if (newMeta.end < newMeta.start) {
    throw new Error("meta.end must be greater than or equal to meta.start");
  }
  if (newMeta.start > newMeta.duration || newMeta.end > newMeta.duration) {
    throw new Error(
      "meta.start and meta.end must be within the duration of the audio",
    );
  }

  writeFileJsonSync(metaPath, newMeta, { overwrite: true, spaces: 2 });

  return newMeta;
}
