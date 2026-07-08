import { exists, readFileJson, writeFileJson } from "welm-cdp/fs";

function createDefaultMeta() {
  return {
    title: "",
    type: "",
    content: "",
    tags: [],
    mood: [],

    // Duration of the audio file, in seconds.
    duration: null,

    // Default playable range, in seconds.
    // null means use the natural boundary:
    // start = 0, end = duration.
    start: 0,
    end: null,

    // Safe interruption points, in seconds.
    cutPoints: [],

    createdAt: "",
    updatedAt: "",
  };
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