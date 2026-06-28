// node
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";

const defaultHost = "127.0.0.1";
const defaultPort = 9222;
const defaultUserDataDir = `${process.env.HOME}/.local/share/welm/chrome-profile`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCdpOptions(options = {}) {
  return {
    host: options.host ?? defaultHost,
    port: options.port ?? defaultPort,
  };
}

function normalizeTarget(target) {
  return {
    targetId: target.id,
    type: target.type ?? "",
    title: target.title ?? "",
    url: target.url ?? "",
  };
}

/**
 * ----------------------------------------------------------------------------
 * Target
 * ----------------------------------------------------------------------------
 */

async function listTargets(options = {}) {
  const cdpOptions = getCdpOptions(options);

  const rawTargets = await CDP.List(cdpOptions);
  const targets = rawTargets.map(normalizeTarget);

  if (options.targetType) {
    return targets.filter((target) => target.type === options.targetType);
  }

  return targets;
}

async function getTarget(targetId, options = {}) {
  const targets = await listTargets(options);

  const target = targets.find((target) => target.targetId === targetId);

  if (!target) {
    throw new Error(`target not found: ${targetId}`);
  }

  return target;
}

async function findTarget(keyword, options = {}) {
  const search = keyword.toLowerCase();
  const targets = await listTargets(options);

  return (
    targets.find(
      (target) =>
        target.title.toLowerCase().includes(search) ||
        target.url.toLowerCase().includes(search),
    ) ?? null
  );
}

async function activateTarget(targetId, options = {}) {
  const cdpOptions = getCdpOptions(options);

  await CDP.Activate({
    ...cdpOptions,
    id: targetId,
  });
}

async function openTarget(url, options = {}) {
  const cdpOptions = getCdpOptions(options);

  const rawTarget = await CDP.New({
    ...cdpOptions,
    url,
  });

  return normalizeTarget(rawTarget);
}

async function closeTarget(targetId, options = {}) {
  const cdpOptions = getCdpOptions(options);

  await CDP.Close({
    ...cdpOptions,
    targetId,
  });
}

/**
 * ----------------------------------------------------------------------------
 * Chrome Lifecycle
 * ----------------------------------------------------------------------------
 */

/**
 * 获取当前平台默认的 Chrome 可执行文件路径。
 */
function getChromeBin() {
  return (
    process.env.CHROME_BIN ||
    {
      darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      linux: "google-chrome",
      win32: "chrome.exe",
    }[process.platform]
  );
}

/**
 * 检查 Chrome 可执行文件是否存在。
 */
async function checkChromeBin(chromeBin = getChromeBin()) {
  if (process.platform === "linux" || process.platform === "win32") {
    return chromeBin;
  }

  try {
    await access(chromeBin, constants.X_OK);
    return chromeBin;
  } catch {
    throw new Error("chrome executable not found");
  }
}

/**
 * 检查 CDP 服务是否可访问。
 */
async function isChromeReady(options = {}) {
  const cdpOptions = getCdpOptions(options);

  try {
    const res = await fetch(
      `http://${cdpOptions.host}:${cdpOptions.port}/json/version`,
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 等待 CDP 服务就绪。
 */
async function waitChromeReady(options = {}) {
  const cdpOptions = getCdpOptions(options);
  const timeout = options.timeout ?? 15000;
  const interval = options.interval ?? 200;

  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await isChromeReady(cdpOptions)) {
      return;
    }

    await sleep(interval);
  }

  throw new Error("Chrome CDP service not ready!");
}

/**
 * 启动带 CDP 调试端口的 Chrome。
 */
async function launchChrome(options = {}) {
  const { host, port } = getCdpOptions(options);
  const chromeBin = await checkChromeBin(options.chromeBin ?? getChromeBin());
  const userDataDir = options.userDataDir ?? defaultUserDataDir;

  const args = [
    `--remote-debugging-address=${host}`,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
  ];

  const child = spawn(chromeBin, args, {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  return {
    host,
    port,
    chromeBin,
    userDataDir,
    launched: true,
  };
}

/**
 * 确保 Chrome 已启动并开放 CDP 服务。
 *
 * 如果 Chrome 未运行，则自动启动。
 * 返回当前连接信息。
 */
export async function ensureChrome(options = {}) {
  let launchInfo;

  if (!(await isChromeReady(options))) {
    const startTime = Date.now();

    options.reporter?.progress(`Starting Chrome...`, options);
    launchInfo = await launchChrome(options);

    options.reporter?.progress(`Waiting for Chrome CDP service...`, options);
    await waitChromeReady(options);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    options.reporter?.progressDone(`Chrome is ready (${elapsed}s)`, options);

    return launchInfo;
  }

  const { host, port } = getCdpOptions(options);
  const chromeBin = await checkChromeBin(options.chromeBin ?? getChromeBin());
  const userDataDir = options.userDataDir ?? defaultUserDataDir;

  return {
    host,
    port,
    chromeBin,
    userDataDir,
    launched: false,
  };
}

/**
 * ----------------------------------------------------------------------------
 * Chrome Page
 * ----------------------------------------------------------------------------
 */

function getPageTargetOptions(options = {}) {
  return {
    ...options,
    targetType: options.targetType ?? "page",
  };
}

export async function listChromePages(options = {}) {
  return await listTargets(getPageTargetOptions(options));
}

export async function getChromePage(targetId, options = {}) {
  return await getTarget(targetId, getPageTargetOptions(options));
}

export async function findChromePage(keyword, options = {}) {
  return await findTarget(keyword, getPageTargetOptions(options));
}

export async function activateChromePage(targetId, options = {}) {
  await activateTarget(targetId, options);

  return await getTarget(targetId, getPageTargetOptions(options));
}

/**
 * 等待页面离开 about:blank。
 *
 * Chrome 创建页面后会先生成 about:blank。
 * 真正导航到目标 URL 是异步过程。
 *
 * 本方法仅表示导航开始，
 * 不表示页面已加载完成。
 */
async function waitLeaveAboutBlank(targetId, options = {}) {
  const timeout = 2000;
  const interval = 50;

  const start = Date.now();

  while (Date.now() - start < timeout) {
    const target = await getTarget(targetId, getPageTargetOptions(options));

    if (target.url !== "about:blank") {
      return;
    }

    const remaining = timeout - (Date.now() - start);
    if (remaining <= 0) break;

    await sleep(Math.min(interval, remaining));
  }

  throw new Error(
    `leave about:blank timeout: targetId=${targetId}, timeout=${timeout}ms`,
  );
}

/**
 * 等待页面加载完成。
 *
 * 先监听 loadEventFired，
 * 再等待页面离开 about:blank，
 * 最后等待页面 load 事件。
 *
 * 这样可以避免监听过晚导致错过事件。
 */
async function waitPageReady(targetId, options = {}) {
  const cdpOptions = getCdpOptions(options);
  const timeout = 30000;

  const client = await CDP({
    ...cdpOptions,
    targetId,
  });

  let timer;

  function cleanup(onLoad) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    client.off("Page.loadEventFired", onLoad);
  }

  try {
    await client.Page.enable();

    let onLoad;

    const loadPromise = new Promise((resolve, reject) => {
      onLoad = () => {
        cleanup(onLoad);
        resolve();
      };

      timer = setTimeout(() => {
        cleanup(onLoad);
        reject(
          new Error(
            `Page load timeout: targetId=${targetId}, timeout=${timeout}ms`,
          ),
        );
      }, timeout);

      client.once("Page.loadEventFired", onLoad);
    });

    await waitLeaveAboutBlank(targetId, options);
    await loadPromise;
  } finally {
    await client.close();
  }
}

export async function openChromePage(url, options = {}) {
  const startTime = Date.now();

  options.reporter?.progress("Opening page...", options);

  let target = await openTarget(url, options);
  const { targetId } = target;

  options.reporter?.progress("Waiting for page...", options);

  await waitPageReady(targetId, options);

  // 由于 url 是异步加载的，因此前面获取的 target title 是空的，需要重新获取。
  target = await getTarget(targetId, getPageTargetOptions(options));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  options.reporter?.progressDone(`Page is ready (${elapsed}s)`, options);

  return target;
}

export async function ensureChromePage(url, options = {}) {
  const keyword = options.keyword ?? url;

  const target = await findChromePage(keyword, options);

  if (target) {
    return target;
  }

  return await openChromePage(url, options);
}

export async function closeChromePage(targetId, options = {}) {
  const target = await getTarget(targetId, getPageTargetOptions(options));

  await closeTarget(targetId, options);

  return target;
}
