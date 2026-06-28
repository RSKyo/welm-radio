import {
  keyAny,
  keyEnter,
  keyDelete,
  keyBackspace,
  copy,
  paste,
  select,
  clear,
  focusHome,
  focusEnd,
  focusLineStart,
  focusLineEnd,
  focusLeft,
  focusRight,
  focusUp,
  focusDown,
  scrollTop,
  scrollBottom,
  appendText,
  fillText,
} from "../cdp/input.js";

export const TEST_COMMANDS = {
  enter: {
    handler: cmd_keyEnter,
  },

  delete: {
    handler: cmd_keyDelete,
  },

  backspace: {
    handler: cmd_keyBackspace,
  },
};

/**
 * ----------------------------------------------------------------------------
 * CLI 命令实现
 * ----------------------------------------------------------------------------
 */


export async function cmd_keyEnter({ argv, options } = {}) {
  const [targetId] = argv;

  return keyEnter(targetId, options);
}

export async function cmd_keyDelete({ argv, options } = {}) {
  const [targetId] = argv;

  return keyDelete(targetId, options);
}

export async function cmd_keyBackspace({ argv, options } = {}) {
  const [targetId] = argv;

  return keyBackspace(targetId, options);
}
