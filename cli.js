#!/usr/bin/env node

import { run } from "./infra/runner.js";
import { resolveCommand } from "./infra/cmd.js";
import { closeAllClients } from "welm-cdp/client";

import { WEB_COMMANDS } from "./cmd/web.js";

// 一级命令分组
const COMMAND_GROUPS = {
  web: WEB_COMMANDS,
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
    cleanup: closeAllClients,
  },
);
