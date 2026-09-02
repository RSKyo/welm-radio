// web/launcher.js
import { fileURLToPath } from "node:url";
import nodePath from "node:path";

import { config } from "welm-cdp/infra/config";
import {
  isServerReady,
  startServer,
  stopServer,
  reloadServer,
  startServerAndPage,
} from "welm-cdp/web";

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

const serverFilePath = nodePath.join(__dirname, "server.js");

const defaultHost = "localhost";
const defaultPort = 3000;

const configHostKeyPath = "radio.web.host";
const configPortKeyPath = "radio.web.port";

let configHost = config.get(configHostKeyPath);
let configPort = config.get(configPortKeyPath);

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function setServerHost(host) {
  assertNonBlankString(host, "host");

  config.set(configHostKeyPath, host);
  configHost = host;

  return host;
}

export function setServerPort(port) {
  assertPort(port);

  config.set(configPortKeyPath, port);
  configPort = port;

  return port;
}

export async function isWebServerReady(options = {}) {
  const { serverHost, serverPort } = getServerOptions(options);

  return await isServerReady({
    ...options,
    serverHost,
    serverPort,
  });
}

export async function startWebServer(options = {}) {
  const { serverHost, serverPort } = getServerOptions(options);

  return await startServer(serverFilePath, {
    ...options,
    serverHost,
    serverPort,
  });
}

export async function stopWebServer(options = {}) {
  const { serverHost, serverPort } = getServerOptions(options);

  return await stopServer({
    ...options,
    serverHost,
    serverPort,
  });
}

export async function reloadWebServer(options = {}) {
  const { serverHost, serverPort } = getServerOptions(options);

  return await reloadServer(serverFilePath, {
    ...options,
    serverHost,
    serverPort,
  });
}

export async function startWebServerAndPage(url, options = {}) {
  const { serverHost, serverPort } = getServerOptions(options);

  return await startServerAndPage(serverFilePath, url, {
    ...options,
    serverHost,
    serverPort,
  });
}

// -----------------------------------------------------------------------------
// Private helpers
// -----------------------------------------------------------------------------

function assertNonBlankString(value, assertionSubject) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${assertionSubject} must be a non-empty string`);
  }
}

function assertPort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("port must be an integer between 1 and 65535");
  }

  return port;
}

function getServerOptions(options = {}) {
  const serverHost = options.serverHost ?? configHost ?? defaultHost;
  const serverPort = options.serverPort ?? configPort ?? defaultPort;

  return {
    serverHost,
    serverPort,
  };
}
