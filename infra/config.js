import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const WELM_HOME = `${os.homedir()}/.local/share/welm`;
const CONFIG_PATH = path.join(WELM_HOME, "config.json");

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.mkdirSync(WELM_HOME, { recursive: true });

    fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2), "utf-8");
  }
}

function readConfigFile() {
  ensureConfigFile();

  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error("[config] Invalid JSON file");
  }
}

function writeConfigFile(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

function getDeepValue(obj, path) {
  if (!path) return obj;

  return path.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, obj);
}

function setDeepValue(obj, path, value) {
  if (!path) return obj;

  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (current[key] == null || typeof current[key] !== "object") {
      current[key] = {};
    }

    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * 读取整个 config
 */
function load() {
  return readConfigFile();
}

/**
 * 获取某个配置值（a.b.c）
 */
function get(p) {
  const config = readConfigFile();
  return getDeepValue(config, p);
}

/**
 * 设置某个配置值（a.b.c = value）
 */
function set(p, value) {
  const config = readConfigFile();

  setDeepValue(config, p, value);

  writeConfigFile(config);

  return true;
}

export const config = {
  load,
  get,
  set,
};
