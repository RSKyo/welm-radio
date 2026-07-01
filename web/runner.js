// web/runner.js
import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const serverPort = 3000;
const serverPath = fileURLToPath(new URL("./server.js", import.meta.url));
const readyUrl = `http://localhost:${serverPort}/__ready`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isHttpReady() {
  const timeout = 500;

  try {
    const response = await fetch(readyUrl, {
      signal: AbortSignal.timeout(timeout),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function waitHttpReady() {
  const timeout = 10000;
  const interval = 200;

  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await isHttpReady()) {
      return true;
    }

    const remaining = timeout - (Date.now() - start);
    if (remaining <= 0) break;

    await sleep(Math.min(interval, remaining));
  }

  throw new Error(`Web server not ready: ${readyUrl}`);
}

export async function ensureWebServer(options = {}) {
  if (await isHttpReady()) {
    return true;
  }

  const child = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    env: process.env,
    detached: true,
    stdio: options.verbose ? "inherit" : "ignore",
  });

  child.unref();

  await waitHttpReady();

  return true;
}

const execFileAsync = promisify(execFile);

export async function stopWebServer() {
  let stdout = "";

  try {
    const result = await execFileAsync("lsof", ["-ti", `:${serverPort}`]);
    stdout = result.stdout;
  } catch {
    return [];
  }

  const pids = stdout
    .split("\n")
    .map((pid) => pid.trim())
    .filter(Boolean);

  for (const pid of pids) {
    process.kill(Number(pid), "SIGTERM");
  }

  return pids;
}