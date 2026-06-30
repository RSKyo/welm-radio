import fs from "fs";
import path from "path";
import config from "../../infra/config.js";


function getRoot() {
  return config.get("radio.root");
}

function setRoot(path) {
  config.set("radio.root", path);
}

function scanAudio(root) {
  return fs.readdirSync(root)
    .filter(f => f.endsWith(".mp3"))
    .map(file => ({
      file,
      fullPath: path.join(root, file)
    }));
}

function loadMeta(dir, file) {
  const metaPath = path.join(
    dir,
    file.replace(".mp3", ".meta.json")
  );

  if (!fs.existsSync(metaPath)) return null;

  return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
}

export function getAudioList() {
  const root = getRoot();
  if (!root) {
    return [];
  }

  const files = scanAudio(root);

  const list = files.map(f => {
    const meta = loadMeta(root, f.file);

    return {
      file: f.file,
      meta
    };
  });

  // 排序：无 meta 在上，有 meta 在下
  list.sort((a, b) => {
    if (!a.meta && b.meta) return -1;
    if (a.meta && !b.meta) return 1;
    return 0;
  });

  return list;
}

