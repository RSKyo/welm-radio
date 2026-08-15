import nodePath from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

import {
  readFileJsonSync,
  writeFileJsonSync,
} from "welm-cdp/fs";
import { assertPlainObject, assertAbsolutePath } from "welm-cdp/common/assert";

function createDefaultMeta(options = {}) {
  const { audioPath, metaPath } = options;

  return {
    id: randomUUID(),
    audioPath: audioPath ?? "", // 音频文件的绝对路径
    metaPath: metaPath ?? "", // 元数据文件的绝对路径
    description: "",
    language: "zh",
    type: "",
    position: "",
    dayPart: [],
    category: [], // 示例：["天气", "新闻", "故事", "段子", "心情", "闲聊", "歌词"]
    cutPoints: [], // HH:MM:SS.mmm[]
    content: "",
    alternateGroup: "", // 同一组音频的不同版本，使用相同的 alternateGroup 值来关联
    duration: null, // HH:MM:SS.mmm
    start: "00:00:00.000", // HH:MM:SS.mmm
    end: null, // HH:MM:SS.mmm
    createdAt: "",
    updatedAt: "",
  };
}

export function loadMeta(audioPath) {
  const { dir, name } = nodePath.parse(audioPath);
  const metaPath = nodePath.join(dir, `${name}.meta.json`);

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
  const { dir, name } = nodePath.parse(audioPath);
  const metaPath = nodePath.join(dir, `${name}.meta.json`);

  const oldMeta = loadMeta(audioPath);
  const now = new Date().toISOString();

  const newMeta = {
    ...oldMeta,
    ...meta,
    createdAt: oldMeta.createdAt === "" ? now : oldMeta.createdAt,
    updatedAt: now,
  };

  writeFileJsonSync(metaPath, newMeta, { overwrite: true, spaces: 2 });

  return newMeta;
}
