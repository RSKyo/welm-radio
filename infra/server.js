// infra/server.js
import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

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

const execFileAsync = promisify(execFile);

export async function stopServerByPort(port) {
  let stdout = "";

  try {
    const result = await execFileAsync("lsof", ["-ti", `:${port}`]);
    stdout = result.stdout;
  } catch (error) {
    // lsof 没找到进程时也会返回非 0，这不是错误
    if (!error.stdout && !error.stderr) {
      return [];
    }

    // 有 stderr 才认为是真错误
    if (error.stderr) {
      throw new Error(error.stderr.trim());
    }

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
