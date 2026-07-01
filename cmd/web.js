import { ensureChrome, ensureChromePage } from "welm-cdp/chrome";

import { log } from "../infra/log.js";
import { ensureWebServer, stopWebServer } from "../web/runner.js";

export const WEB_COMMANDS = {
  "audio-library": {
    handler: cmd_web_audio_library,
  },

  stop: {
    handler: cmd_web_stop,
  },
};

export async function cmd_web_audio_library({ argv, options } = {}) {
  const url = "http://localhost:3000/audio-library/";

  await ensureWebServer(options);

  await ensureChrome(options);
  const { targetId } = await ensureChromePage(url, options);

  log.info(`audio-library is ready: ${url}`, options);

  return {
    url,
    targetId,
  };
}

export async function cmd_web_stop({ argv, options } = {}) {
  const pids = await stopWebServer(options);

  if (pids.length === 0) {
    log.info("Web server is not running", options);
    return true;
  }

  log.info(`Web server stopped: ${pids.join(", ")}`, options);

  return {
    stopped: true,
    pids,
  };
}
