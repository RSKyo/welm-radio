#!/usr/bin/env node

import { run } from "./infra/protocol.js";
import { resolveCommand } from "./infra/cmd-resolver.js";
import { closeAllClients } from "./cdp/client.js";

import { TEST_COMMANDS } from "./cmd/test.js";
import { CHROME_COMMANDS } from "./cmd/chrome.js";
import { CHATGPT_COMMANDS } from "./cmd/chatgpt.js";

// 一级命令分组
const COMMAND_GROUPS = {
  test: TEST_COMMANDS,
  chrome: CHROME_COMMANDS,
  chatgpt: CHATGPT_COMMANDS,
};

const json = process.argv.includes("--json");

run(
  async () => {
    const ctx = resolveCommand(process.argv, COMMAND_GROUPS);
    return await ctx.handler(ctx);
  },
  {
    json,
    cleanup: closeAllClients,
  },
);
