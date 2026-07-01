// infra/server.js
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isHttpReady(url) {
  const timeout = 500;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function waitHttpReady(url) {
  const timeout = 10000;
  const interval = 200;

  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await isHttpReady(url)) {
      return true;
    }

    const remaining = timeout - (Date.now() - start);
    if (remaining <= 0) break;

    await sleep(Math.min(interval, remaining));
  }

  throw new Error(`HTTP service not ready: ${url}`);
}

export async function ensureNodeHttpService(serverFile, url, options = {}) {
  if (!(await isHttpReady(url))) {
    const serverPath = fileURLToPath(new URL(serverFile, import.meta.url));

    const child = spawn(process.execPath, [serverPath], {
      cwd: path.dirname(serverPath),
      env: process.env,
      detached: true,
      stdio: options.verbose ? "inherit" : "ignore",
    });

    child.unref();

    await waitHttpReady(url);
  }

  return true;
}
