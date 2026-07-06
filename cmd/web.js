import { ensureWebServer, stopWebServer } from "../web/runner.js";

import {
  ensureChrome,
  ensureChromePage,
  activateChromePage,
} from "welm-cdp/chrome";

const serverPort = 3000;

export const WEB_COMMANDS = {
  "audio-library": {
    handler: cmd_audio_library,
  },

  stop: {
    handler: cmd_stop,
  },
};

async function cmd_audio_library({ argv, options } = {}) {
  // default index.html is in the web/audio-library directory.
  const url = `http://localhost:${serverPort}/audio-library/index.html`;

  // start the web server if not already running
  await ensureWebServer(options);

  // ensure Chrome is running and open the audio-library page
  const { targetId } = await ensureChromeAndPage(url, options);

  const { reporter } = options;
  reporter?.info?.(`${targetId}`, options);
  reporter?.info?.(`${url}`, options);

  return {
    url,
    targetId,
  };
}

async function cmd_stop({ argv, options } = {}) {
  let pids = [];

  pids = await stopWebServer(options);

  const { reporter } = options;

  for (const pid of pids) {
    reporter?.info?.(`Web server stopped: ${pid}`, options);
  }

  return {
    ...pids,
  };
}

async function ensureChromeAndPage(url, options = {}) {
  await ensureChrome(options);

  const target = await ensureChromePage(url, options);
  await activateChromePage(target.targetId, options);
  return target;
}
