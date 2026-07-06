// web/runner.js
import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  ensureChrome,
  ensureChromePage,
  closeChromePage,
  activateChromePage,
} from "welm-cdp/chrome";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPort = 3000;
const serverPath = path.join(__dirname, "server.js");
const readyUrl = `http://localhost:${serverPort}/__ready`;
const execFileAsync = promisify(execFile);

// #region Public API

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

export async function stopWebServer(options = {}) {
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

export async function reloadWebServer(options = {}) {
  await stopWebServer(options);
  await ensureWebServer(options);
}

export async function ensureWebStarted(url, options = {}) {
  // start the web server if not already running
  await ensureWebServer(options);

  // ensure Chrome is running and open the audio-library page
  await ensureChrome(options);
  const { targetId } = await ensureChromePage(url, options);
  await activateChromePage(targetId, options);

  return {
    url,
    targetId,
  };
}

// #endregion

// #region Private helpers

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

// #endregion
