import { ERROR_CODE, createError } from "./error.js";

function optionNameToKey(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function isNumberString(value) {
  if (typeof value !== "string") return false;

  const text = value.trim();

  if (text === "") return false;

  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(text);
}

function isBooleanString(value) {
  if (typeof value !== "string") return false;

  const text = value.trim().toLowerCase();

  return text === "true" || text === "false";
}

function isQuotedString(value) {
  if (typeof value !== "string") return false;

  const text = value.trim();

  if (text.length < 2) return false;

  const first = text[0];
  const last = text[text.length - 1];

  return (first === `"` && last === `"`) || (first === `'` && last === `'`);
}

function unquoteString(value) {
  return value.trim().slice(1, -1);
}

function isArrayString(value) {
  if (typeof value !== "string") return false;

  const text = value.trim();

  return text.startsWith("[") && text.endsWith("]");
}

function parseArrayLiteral(value) {
  const text = value.trim().slice(1, -1).trim();

  if (text === "") {
    return [];
  }

  return text.split(",").map((item) => parseValue(item.trim()));
}

function parseValue(value) {
  if (isNumberString(value)) {
    return Number(value);
  }

  if (isBooleanString(value)) {
    return value.trim().toLowerCase() === "true";
  }

  if (isQuotedString(value)) {
    return unquoteString(value);
  }

  if (isArrayString(value)) {
    return parseArrayLiteral(value);
  }

  return value;
}

function splitArgs(input = []) {
  const argv = [];
  const options = {};

  for (const part of input) {
    if (part.startsWith("--")) {
      const body = part.slice(2);
      const eqIndex = body.indexOf("=");

      if (!body) {
        throw createError(ERROR_CODE.INVALID_CMD, "invalid option: --");
      }

      if (eqIndex === -1) {
        options[optionNameToKey(body)] = true;
        continue;
      }

      const name = body.slice(0, eqIndex);
      const value = body.slice(eqIndex + 1);

      if (!name) {
        throw createError(ERROR_CODE.INVALID_CMD, `invalid option: ${part}`);
      }

      options[optionNameToKey(name)] = parseValue(value);
      continue;
    }

    argv.push(parseValue(part));
  }

  return { argv, options };
}

function getCommandNames(commands) {
  return Object.keys(commands).join(", ");
}

function isTargetId(value) {
  return /^[0-9A-F]{32}$/i.test(value);
}

export function resolveCommand(processArgv, commandGroups) {
  // groupName, commandName, ...args(includes targetId)
  // targetId, groupName, commandName, ...args(excludes targetId)
  const [, , arg1, arg2, ...rest] = processArgv;

  let groupName;
  let commandName;
  let args;

  if (isTargetId(arg1)) {
    groupName = arg2;
    commandName = rest.shift();
    args = [arg1, ...rest];
  } else {
    groupName = arg1;
    commandName = arg2;
    args = rest;
  }

  const groupNames = getCommandNames(commandGroups);

  if (!groupName) {
    throw createError(
      ERROR_CODE.MISSING_CMD,
      `missing command group, expected one of: ${groupNames}`,
    );
  }

  if (!Object.hasOwn(commandGroups, groupName)) {
    throw createError(
      ERROR_CODE.INVALID_CMD,
      `unknown command group: ${groupName}, expected one of: ${groupNames}`,
    );
  }

  const commands = commandGroups[groupName];
  const commandNames = getCommandNames(commands);

  if (!commandName) {
    throw createError(
      ERROR_CODE.MISSING_CMD,
      `missing command, expected one of: ${commandNames}`,
    );
  }

  if (!Object.hasOwn(commands, commandName)) {
    throw createError(
      ERROR_CODE.INVALID_CMD,
      `unknown command: ${commandName}, expected one of: ${commandNames}`,
    );
  }

  const command = commands[commandName];

  if (!command || typeof command.handler !== "function") {
    throw createError(
      ERROR_CODE.INVALID_CMD,
      `invalid command handler: ${groupName} ${commandName}`,
    );
  }

  const { argv, options } = splitArgs(args);

  return {
    groupName,
    commandName,

    argv,
    options,

    command,
    commands,

    handler: command.handler,
  };
}
