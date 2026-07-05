#!/usr/bin/env node

import { run } from "./infra/runner.js";
import { resolveCommand } from "./infra/cmd.js";
import { closeCdpClients } from "./cdp/lifecycle.js";

import { TEST_COMMANDS } from "./cmd/test.js";
import { CHROME_COMMANDS } from "./cmd/chrome.js";
import { CLIPBOARD_COMMANDS } from "./cmd/clipboard.js";
import { CHATGPT_COMMANDS } from "./cmd/chatgpt.js";

// 一级命令分组
const COMMAND_GROUPS = {
  test: TEST_COMMANDS,
  chrome: CHROME_COMMANDS,
  clipboard: CLIPBOARD_COMMANDS,
  chatgpt: CHATGPT_COMMANDS,
};

const json = process.argv.includes("--json");
const stack = process.argv.includes("--stack");

run(
  async () => {
    const ctx = resolveCommand(process, COMMAND_GROUPS);
    return await ctx.handler(ctx);
  },
  {
    json,
    stack,
    cleanup: closeCdpClients,
  },
);
