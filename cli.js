#!/usr/bin/env node
import { run } from "welm-cdp/cli/runner";
import { WEB_COMMANDS } from "./commands/web.js";

const COMMAND_GROUPS = {
  web: WEB_COMMANDS,
};

run(COMMAND_GROUPS, {
  cleanup: closeClients,
});
