import { log } from "../infra/log.js";
import { assertNonBlank, assertHttpUrl } from "../infra/validate.js";
import {
  ensureChrome,
  listChromePages,
  getChromePage,
  findChromePage,
  activateChromePage,
  openChromePage,
  ensureChromePage,
  closeChromePage,
} from "../cdp/chrome.js";

const CDP_OPTIONS = "--host --port";
const CHROME_OPTIONS = "--chrome-bin --user-data-dir";
const PAGE_OPTIONS = "--target-type";

/**
 * Chrome CLI 命令注册表。
 *
 * chrome ready
 * chrome list
 * chrome get
 * chrome find
 * chrome activate
 * chrome open
 * chrome ensure
 * chrome close
 */
export const CHROME_COMMANDS = {
  ready: {
    handler: cmd_ensureChrome,
    usage: "chrome ready [options]",
    description: "Ensure Chrome and CDP service ready",
    options: `${CDP_OPTIONS} ${CHROME_OPTIONS}`,
  },

  list: {
    handler: cmd_listChromePages,
    usage: "chrome list [options]",
    description: "List Chrome pages",
    options: `${CDP_OPTIONS} ${PAGE_OPTIONS}`,
  },

  get: {
    handler: cmd_getChromePage,
    usage: "chrome get <targetId> [options]",
    description: "Get Chrome page",
    options: `${CDP_OPTIONS} ${PAGE_OPTIONS}`,
  },

  find: {
    handler: cmd_findChromePage,
    usage: "chrome find <keyword> [options]",
    description: "Find Chrome page",
    options: `${CDP_OPTIONS} ${PAGE_OPTIONS}`,
  },

  activate: {
    handler: cmd_activateChromePage,
    usage: "chrome activate <targetId> [options]",
    description: "Activate Chrome page",
    options: `${CDP_OPTIONS} ${PAGE_OPTIONS}`,
  },

  open: {
    handler: cmd_openChromePage,
    usage: "chrome open <url> [options]",
    description: "Open Chrome page",
    options: CDP_OPTIONS,
  },

  ensure: {
    handler: cmd_ensureChromePage,
    usage: "chrome ensure <url> [options]",
    description: "Ensure Chrome page",
    options: `--keyword ${CDP_OPTIONS} ${PAGE_OPTIONS}`,
  },

  close: {
    handler: cmd_closeChromePage,
    usage: "chrome close <targetId> [options]",
    description: "Close Chrome page",
    options: `${CDP_OPTIONS} ${PAGE_OPTIONS}`,
  },
};

/**
 * ----------------------------------------------------------------------------
 * CLI 命令实现
 * ----------------------------------------------------------------------------
 */

/**
 * 确保 Chrome 与 CDP 服务已就绪。
 */
export async function cmd_ensureChrome({ options } = {}) {
  const launchInfo = await ensureChrome(options);

  if (launchInfo.launched) {
    log.info(
      `CDP endpoint: http://${launchInfo.host}:${launchInfo.port}`,
      options,
    );
    log.info(`Using Chrome executable: ${launchInfo.chromeBin}`, options);
    log.info(`Using Chrome user data dir: ${launchInfo.userDataDir}`, options);
  }

  return launchInfo;
}

/**
 * 获取所有 Chrome 页面。
 */
export async function cmd_listChromePages({ options } = {}) {
  const targets = await listChromePages(options);

  const total = targets.length;
  targets.forEach((target, index) => {
    log.info(
      `(${index + 1}/${total}) ${target.targetId} ${target.title}`,
      options,
    );
  });

  return targets;
}

/**
 * 获取指定 Chrome 页面。
 */
export async function cmd_getChromePage({ argv, options } = {}) {
  const [targetId] = argv;
  assertNonBlank(targetId, "targetId");

  const target = await getChromePage(targetId, options);

  log.info(`${target.targetId} ${target.title}`, options);

  return target;
}

/**
 * 根据关键字查找 Chrome 页面。
 */
export async function cmd_findChromePage({ argv, options } = {}) {
  const [keyword] = argv;
  assertNonBlank(keyword, "keyword");

  const target = await findChromePage(keyword, options);

  if (target) {
    log.info(`${target.targetId} ${target.title}`, options);
  } else {
    log.warn(`No matching Chrome page found for keyword: ${keyword}`, options);
  }

  return target;
}

/**
 * 激活 Chrome 页面。
 */
export async function cmd_activateChromePage({ argv, options } = {}) {
  const [targetId] = argv;
  assertNonBlank(targetId, "targetId");

  const target = await activateChromePage(targetId, options);

  log.info(`${target.targetId} ${target.title}`, options);

  return target;
}

/**
 * 新建 Chrome 页面。
 */
export async function cmd_openChromePage({ argv, options } = {}) {
  const [url] = argv;
  assertHttpUrl(url, "url");

  const target = await openChromePage(url, options);

  log.info(`${target.targetId} ${target.title}`, options);

  return target;
}

/**
 * 查找或打开 Chrome 页面。
 */
export async function cmd_ensureChromePage({ argv, options } = {}) {
  const [url] = argv;
  assertHttpUrl(url, "url");

  const target = await ensureChromePage(url, options);

  log.info(`${target.targetId} ${target.title}`, options);

  return target;
}

/**
 * 关闭 Chrome 页面。
 */
export async function cmd_closeChromePage({ argv, options } = {}) {
  const [targetId] = argv;
  assertNonBlank(targetId, "targetId");

  const target = await closeChromePage(targetId, options);

  log.info(`${target.targetId} ${target.title}`, options);

  return target;
}
