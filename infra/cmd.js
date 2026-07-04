// -----------------------------------------------------------------------------
// cmd
// -----------------------------------------------------------------------------
// Command resolver for CLI programs.
//
// Public API:
// - resolveCommand(process, commandGroups)
//
// Responsibilities:
// - Read command arguments from process.argv.
// - Resolve command group and command name.
// - Parse positional arguments and --options.
// - Validate command group, command entry, and command handler.
// - Return the resolved handler with argv and options.
//
// Supported command forms:
// - group command ...args
// - targetId group command ...args
//
// Supported option forms:
// - --flag
// - --name=value
//
// Version: 0.1.0
// Last modified: 2026-07-04
// -----------------------------------------------------------------------------

const TARGET_ID_RE = /^[0-9A-F]{32}$/i;
const NUMBER_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;

// #region Public API

export function resolveCommand(process, commandGroups) {
  const { groupName, commandName, args } = resolveCommandPath(process.argv);

  const commandGroup = getCommandGroup(commandGroups, groupName);
  const command = getCommand(commandGroup, groupName, commandName);

  const { argv, options } = parseCommandArgs(args);

  return {
    groupName,
    commandName,

    argv,
    options,

    command,
    commandGroup,

    handler: command.handler,
  };
}

// #endregion

// #region Resolve command path from process.argv

function resolveCommandPath(processArgv) {
  const input = processArgv.slice(2);

  if (input.length === 0) {
    throw new Error("missing command group and command name");
  }

  if (isTargetId(input[0])) {
    if (input.length === 1) {
      throw new Error("missing command group and command name");
    }

    if (input.length === 2) {
      throw new Error("missing command name");
    }

    return {
      groupName: input[1],
      commandName: input[2],
      args: [input[0], ...input.slice(3)],
    };
  }

  if (input.length === 1) {
    throw new Error("missing command name");
  }

  return {
    groupName: input[0],
    commandName: input[1],
    args: input.slice(2),
  };
}

function isTargetId(value) {
  return typeof value === "string" && TARGET_ID_RE.test(value);
}

// #endregion

// #region Command group and command lookup

function getCommandGroup(commandGroups, groupName) {
  if (!isPlainObject(commandGroups)) {
    throw new Error("invalid command groups");
  }

  const groupNames = Object.keys(commandGroups).join(", ");

  if (!Object.hasOwn(commandGroups, groupName)) {
    throw new Error(
      `unknown command group: ${groupName}, expected one of: ${groupNames}`,
    );
  }

  const commandGroup = commandGroups[groupName];

  if (!isPlainObject(commandGroup)) {
    throw new Error(`invalid command group: ${groupName}`);
  }

  return commandGroup;
}

function getCommand(commandGroup, groupName, commandName) {
  const commandNames = Object.keys(commandGroup).join(", ");

  if (!Object.hasOwn(commandGroup, commandName)) {
    throw new Error(
      `unknown command: ${commandName}, expected one of: ${commandNames}`,
    );
  }

  const command = commandGroup[commandName];

  if (!isPlainObject(command)) {
    throw new Error(`invalid command: ${groupName} ${commandName}`);
  }

  if (!Object.hasOwn(command, "handler")) {
    throw new Error(`missing command handler: ${groupName} ${commandName}`);
  }

  if (typeof command.handler !== "function") {
    throw new Error(`invalid command handler: ${groupName} ${commandName}`);
  }

  return command;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}

// #endregion

// #region Command args and options parsing

function parseCommandArgs(input = []) {
  const argv = [];
  const options = {};

  for (const item of input) {
    if (item.startsWith("--")) {
      const { name, value } = parseOption(item);
      options[optionNameToKey(name)] = value;
      continue;
    }

    argv.push(parseValue(item));
  }

  return { argv, options };
}

function parseOption(item) {
  const body = item.slice(2);

  if (body === "") {
    throw new Error("invalid option: --");
  }

  const eqIndex = body.indexOf("=");

  if (eqIndex === -1) {
    return {
      name: body,
      value: true,
    };
  }

  const name = body.slice(0, eqIndex);
  const value = body.slice(eqIndex + 1);

  if (name === "") {
    throw new Error(`invalid option: ${item}`);
  }

  return {
    name,
    value: parseValue(value),
  };
}

function optionNameToKey(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// #endregion

// #region Value parsing

function parseValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  const text = value.trim();
  const lowerText = text.toLowerCase();

  if (NUMBER_RE.test(text)) {
    return Number(text);
  }

  if (lowerText === "true") {
    return true;
  }

  if (lowerText === "false") {
    return false;
  }

  if (isQuotedString(text)) {
    return text.slice(1, -1);
  }

  if (isArrayString(text)) {
    return parseArrayString(text);
  }

  return value;
}

function parseArrayString(text) {
  const body = text.slice(1, -1).trim();

  if (body === "") {
    return [];
  }

  return body.split(",").map((item) => parseValue(item.trim()));
}

function isQuotedString(text) {
  if (text.length < 2) {
    return false;
  }

  return (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  );
}

function isArrayString(text) {
  if (text.length < 2) {
    return false;
  }

  return text.startsWith("[") && text.endsWith("]");
}

// #endregion
