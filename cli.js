#!/usr/bin/env node
import { resolveCommand } from "./infra/cmd.js";
import { run } from "./infra/runner.js";
import { log } from "./infra/log.js";
import { COMMAND_GROUPS } from "./cmd/_cmd.js";

import { closeCdpClients } from "welm-cdp/lifecycle";

const json = process.argv.includes("--json");
const stack = process.argv.includes("--stack");

const runOptions = {
  json,
  stack,
  cleanup: closeCdpClients,
  reporter: log,
};

run(
  async () => {
    const ctx = resolveCommand(process, COMMAND_GROUPS);
    ctx.options.reporter = log;
    return await ctx.handler(ctx);
  },
  runOptions,
);
