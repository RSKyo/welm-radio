import {
  ensureWebServer,
  stopWebServer,
  reloadWebServer,
  ensureWebStarted,
} from "../web/launcher.js";

const serverPort = 3000;

export const WEB_COMMANDS = {
  start: {
    handler: cmd_web_start,
  },

  stop: {
    handler: cmd_web_stop,
  },

  reload: {
    handler: cmd_web_reload,
  },

  "audio-library": {
    handler: cmd_audio_library,
  },
};

export async function cmd_web_start({ argv, options } = {}) {
  return await ensureWebServer(options);
}

export async function cmd_web_stop({ argv, options } = {}) {
  const pids = await stopWebServer(options);

  const { reporter } = options;

  for (const pid of pids) {
    reporter?.info?.(`Web server stopped: ${pid}`, options);
  }

  return pids;
}

export async function cmd_web_reload({ argv, options } = {}) {
  return await reloadWebServer(options);
}

export async function cmd_audio_library({ argv, options } = {}) {
  const url = `http://localhost:${serverPort}/audio-library/index.html`;

  await ensureWebServer(options);

  return await ensureWebStarted(url, options);
}
