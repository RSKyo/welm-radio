const COLOR = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
};

let lastLength = 0;

export const log = {
  info,
  warn,
  error,
  success,
  progress,
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

function progressBar(current, total, text = "") {
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
