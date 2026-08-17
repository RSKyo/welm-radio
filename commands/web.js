import {
  startWebServer,
  stopWebServer,
  reloadWebServer,
  startWebServerAndPage,
} from "../web/launcher.js";

const serverPort = 3000;

export const WEB_COMMANDS = {
  "start": {
    handler: cmd_start,
  },

  "stop": {
    handler: cmd_stop,
  },

  "reload": {
    handler: cmd_reload,
  },

  "audio-library": {
    handler: cmd_audioLibrary,
  },

  "audio-studio": {
    handler: cmd_audioStudio,
  }
};

export async function cmd_start({ argv, options } = {}) {
  return await startWebServer(options);
}

export async function cmd_stop({ argv, options } = {}) {
  const pids = await stopWebServer(options);

  const { reporter } = options;

  for (const pid of pids) {
    reporter?.info?.(`Web server stopped: ${pid}`, options);
  }

  return pids;
}

export async function cmd_reload({ argv, options } = {}) {
  return await reloadWebServer(options);
}

export async function cmd_audioLibrary({ argv, options } = {}) {
  const url = `http://localhost:${serverPort}/audio.html`;

  return await startWebServerAndPage(url, options);
}

export async function cmd_audioStudio({ argv, options } = {}) {
  const url = `http://localhost:${serverPort}/studio.html`;

  return await startWebServerAndPage(url, options);
}
