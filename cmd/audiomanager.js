import { ensureNodeHttpService, stopServerByPort } from "../infra/server.js";
import {
  ensureChrome,
  ensureChromePage,
  findChromePage,
  closeChromePage,
} from "welm-cdp/chrome";
import { log } from "../infra/log.js";

export const AUDIOMANAGER_COMMANDS = {
  ready: {
    handler: cmd_audiomanager_ready,
  },
  stop: {
    handler: cmd_audiomanager_stop,
  },
};

const url = "http://localhost:3000/audiomanager.html";

export async function cmd_audiomanager_ready({ argv, options } = {}) {
  const serverFile = "../audiomanager/server.js";

  await ensureNodeHttpService(serverFile, url, options);

  await ensureChrome(options);
  const target = await ensureChromePage(url, options);

  log.info("Audio manager is ready", options);
  log.info(`target: ${target.targetId} ${target.title}`, options);
  log.info(`url: ${url}`, options);

  return target;
}

export async function cmd_audiomanager_stop({ argv, options } = {}) {
  const target = await findChromePage(url, options);

  if (target) {
    await closeChromePage(target.targetId, options);
  }

  const pids = await stopServerByPort(3000);

  log.info(
    pids.length
      ? `Audio manager stopped: ${pids.join(", ")}`
      : "Audio manager is not running",
  );

  return true;
}
