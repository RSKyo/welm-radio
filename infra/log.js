const COLOR = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
};

let lastLength = 0;

export const log = {
  info,
  warn,
  error,
  success,
  progress,
  debug,
  progressDone,
  progressBar,
};

function getDisplayWidth(text) {
  let width = 0;

  for (const ch of text) {
    width += ch.charCodeAt(0) > 255 ? 2 : 1;
  }

  return width;
}

// --json 表示命令输出为 JSON，此时不输出任何日志，只返回最终结果。
function isSilent(options = {}) {
  return options.json === true;
}

function isDebug(options = {}) {
  return options.debug === true;
}

function info(text = "", options = {}) {
  if (isSilent(options)) return;

  if (lastLength > 0) {
    process.stdout.write("\n");
    lastLength = 0;
  }

  process.stdout.write(`${text}\n`);
}

function warn(text = "", options = {}) {
  if (isSilent(options)) return;

  if (lastLength > 0) {
    process.stdout.write("\n");
    lastLength = 0;
  }

  process.stdout.write(`${COLOR.yellow}WARN: ${text}${COLOR.reset}\n`);
}

function error(text = "", options = {}) {
  if (isSilent(options)) return;

  if (lastLength > 0) {
    process.stdout.write("\n");
    lastLength = 0;
  }

  process.stdout.write(`${COLOR.red}ERROR: ${text}${COLOR.reset}\n`);
}

function success(text = "", options = {}) {
  if (isSilent(options)) return;

  if (lastLength > 0) {
    process.stdout.write("\n");
    lastLength = 0;
  }

  process.stdout.write(`${COLOR.green}${text}${COLOR.reset}\n`);
}

function progress(text = "", options = {}) {
  if (isSilent(options)) return;

  const padding = Math.max(0, lastLength - getDisplayWidth(text));

  process.stdout.write(
    `\r${text}${" ".repeat(padding)}`
  );

  lastLength = getDisplayWidth(text);
}

function progressDone(text = "", options = {}) {
  if (isSilent(options)) return;

  const padding = Math.max(0, lastLength - getDisplayWidth(text));

  process.stdout.write(
    `\r${text}${" ".repeat(padding)}\n`
  );

  lastLength = 0;
}

function progressBar(current, total, text = "", options = {}) {
  const width = 30;

  const percent = current / total;

  const filled = Math.floor(width * percent);

  const bar =
    "█".repeat(filled) +
    "░".repeat(width - filled);

  process.stdout.write(
    `\r[${bar}] ${Math.floor(percent * 100)}% ${text}`
  );
}


function getCallerInfo() {
  const stack = new Error().stack;

  if (!stack) {
    return "";
  }

  const lines = stack.split("\n");

  // 0: Error
  // 1: at getCallerInfo ...
  // 2: at Object.debug / debug ...
  // 3: at 真正调用 log.debug 的地方
  const callerLine = lines[3];

  if (!callerLine) {
    return "";
  }

  const match = callerLine.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);

  if (!match) {
    return callerLine.trim();
  }

  const functionName = match[1] || "<anonymous>";
  const filePath = match[2];
  const line = match[3];

  const fileName = filePath.split("/").pop();

  return `${fileName}:${line} ${functionName}`;
}

function debug(text = "", options = {}) {
  if (isSilent(options)) return;
  if (!isDebug(options)) return;

  if (lastLength > 0) {
    process.stdout.write("\n");
    lastLength = 0;
  }

  const caller = getCallerInfo();
  const prefix = caller ? `DEBUG: [${caller}] ` : "DEBUG: ";

  process.stdout.write(`${COLOR.gray}${prefix}${text}${COLOR.reset}\n`);
}