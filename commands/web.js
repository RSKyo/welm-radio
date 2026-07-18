import {
  ensureWebServer,
  stopWebServer,
  reloadWebServer,
  ensureWebStarted,
} from "../web/infra/launcher.js";

const serverPort = 3000;

export const WEB_COMMANDS = {
  "start": {
    handler: cmd_ensureWebServer,
  },

  "stop": {
    handler: cmd_stopWebServer,
  },

  "reload": {
    handler: cmd_reloadWebServer,
  },

  "audio-library": {
    handler: cmd_ensureWebStarted,
  },
};

export async function cmd_ensureWebServer({ argv, options } = {}) {
  return await ensureWebServer(options);
}

export async function cmd_stopWebServer({ argv, options } = {}) {
  const pids = await stopWebServer(options);

  const { reporter } = options;

  for (const pid of pids) {
    reporter?.info?.(`Web server stopped: ${pid}`, options);
  }

  return pids;
}

export async function cmd_reloadWebServer({ argv, options } = {}) {
  return await reloadWebServer(options);
}

export async function cmd_ensureWebStarted({ argv, options } = {}) {
  const url = `http://localhost:${serverPort}/audio-library/index.html`;

  return await ensureWebStarted(url, options);
}
