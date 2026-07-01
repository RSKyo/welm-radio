#!/usr/bin/env node

import { run } from "./infra/protocol.js";
import { resolveCommand } from "./infra/cmd-resolver.js";
import { closeAllClients } from "welm-cdp/client";

import { AUDIOMANAGER_COMMANDS } from "./cmd/audiomanager.js";

// 一级命令分组
const COMMAND_GROUPS = {
  audiomanager: AUDIOMANAGER_COMMANDS,
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
