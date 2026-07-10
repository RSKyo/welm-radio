import { exists, readFileJson, writeFileJson } from "welm-cdp/fs";

export const AUDIO_META_TYPES = [
  { value: "voice", label: "人声" },
  { value: "music", label: "音乐" },
  { value: "bed", label: "背景垫乐" },
  { value: "ambience", label: "环境声" },
  { value: "effect", label: "音效" },
  { value: "jingle", label: "标识音" },
  { value: "mixed", label: "混合成品" },
];

export const AUDIO_META_POSITIONS = [
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

export function listMetaType() {
  return AUDIO_META_TYPES;
}

export function loadMeta(metaPath) {
  if (!exists(metaPath)) {
    return createDefaultMeta();
  }

  try {
    return {
      ...createDefaultMeta(),
      ...readFileJson(metaPath),
    };
  } catch {
    return createDefaultMeta();
  }
}

export function saveMeta(metaPath, data = {}) {
  const oldMeta = loadMeta(metaPath);
  const now = new Date().toISOString();

  const meta = {
    ...oldMeta,
    ...data,
    createdAt: oldMeta?.createdAt || now,
    updatedAt: now,
  };

  writeFileJson(metaPath, meta);

  return meta;
}


export function parseTimeText(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`invalid time value: ${value}`);
  }

  const text = value.trim();
  const match = text.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);

  if (!match) {
    throw new Error(`invalid time format: ${value}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number((match[4] ?? "0").padEnd(3, "0"));

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

export function formatTimeText(seconds) {
  if (seconds == null) {
    return null;
  }

  const totalMs = Math.round(seconds * 1000);

  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":") + `.${String(ms).padStart(3, "0")}`;
}