import fs from "node:fs";

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
  if (!fs.existsSync(metaPath)) {
    return createDefaultMeta();
  }

  try {
    return {
      ...createDefaultMeta(),
      ...JSON.parse(fs.readFileSync(metaPath, "utf-8")),
    };
  } catch {
    return createDefaultMeta();
  }
}

export function saveMeta(metaPath, data = {}) {
  const oldMeta = fs.existsSync(metaPath) ? loadMeta(metaPath) : null;
  const now = new Date().toISOString();

  const meta = {
    ...createDefaultMeta(),
    ...oldMeta,
    ...data,
    createdAt: oldMeta?.createdAt || now,
    updatedAt: now,
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");

  return meta;
}