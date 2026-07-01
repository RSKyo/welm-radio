import { ensureNodeHttpService } from "../infra/server.js";
import { ensureChrome, ensureChromePage } from "welm-cdp/chrome";
import { log } from "../infra/log.js";

export const AUDIOMANAGER_COMMANDS = {
  ready: {
    handler: cmd_audiomanager_ready,
  },
};

export async function cmd_audiomanager_ready({ argv, options } = {}) {
  const serverFile = "../audiomanager/server.js";
  const url = "http://localhost:3000/audiomanager.html";

  await ensureNodeHttpService(serverFile, url, options);

  await ensureChrome(options);
  const target = await ensureChromePage(url, options);

  log.info("Audio manager is ready", options);
  log.info(`target: ${target.targetId} ${target.title}`, options);
  log.info(`url: ${url}`, options);

  return target;
}
