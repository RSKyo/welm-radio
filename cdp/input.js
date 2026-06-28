import { getClient } from "./client.js";
import { focus, scrollIntoView, waitEditable } from "./dom.js";

import { writeClipboard } from "../utils/clipboard.js";

/**
 * ----------------------------------------------------------------------------
 * Base Utils
 * ----------------------------------------------------------------------------
 */

function q(value) {
  return JSON.stringify(value);
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prop(key, value) {
  return value === undefined ? {} : { [key]: value };
}

const MODIFIER_KEYS = {
  alt: {
    key: "Alt",
    code: "AltLeft",
    modifiers: 1,
  },

  ctrl: {
    key: "Control",
    code: "ControlLeft",
    modifiers: 2,
  },

  meta: {
    key: "Meta",
    code: "MetaLeft",
    modifiers: 4,
  },

  shift: {
    key: "Shift",
    code: "ShiftLeft",
    modifiers: 8,
  },
};

function resolveModifiers(modifierKeys) {
  if (!modifierKeys) {
    return { entries: [], modifiers: 0 };
  }

  const keys = Array.isArray(modifierKeys) ? modifierKeys : [modifierKeys];

  const entries = [];
  let modifiers = 0;

  for (const k of keys) {
    const entry = MODIFIER_KEYS[k.toLowerCase()];
    if (!entry) continue;

    entries.push(entry);
    modifiers |= entry.modifiers;
  }

  return { entries, modifiers };
}

async function pressKey(targetId, key, code, options = {}) {
  const { Input } = await getClient(targetId, options);

  const { entries, modifiers } = resolveModifiers(options.keyEventWith);

  const event = {
    key,
    code,
    modifiers,
    ...prop("windowsVirtualKeyCode", options.keyEventWindowsVirtualKeyCode),
    ...prop("nativeVirtualKeyCode", options.keyEventNativeVirtualKeyCode),
  };

  for (const entry of entries) {
    await Input.dispatchKeyEvent({
      type: "keyDown",
      key: entry.key,
      code: entry.code,
    });

    await sleep(random(10, 30));
  }

  await Input.dispatchKeyEvent({
    type: modifiers === 0 ? "keyDown" : "rawKeyDown",
    ...event,
    ...prop("text", options.keyEventText),
    ...prop("commands", options.keyEventCommands),
  });

  await sleep(random(10, 30));

  await Input.dispatchKeyEvent({
    type: "keyUp",
    ...event,
  });

  await sleep(random(10, 40));

  const reversed = [...entries].reverse();
  for (const entry of reversed) {
    await Input.dispatchKeyEvent({
      type: "keyUp",
      key: entry.key,
      code: entry.code,
    });

    await sleep(random(10, 40));
  }

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Key
 * ----------------------------------------------------------------------------
 */

export async function keyAny(targetId, key, code, options = {}) {
  await pressKey(targetId, key, code, options);
}

export async function keyEnter(targetId, options = {}) {
  await pressKey(targetId, "Enter", "Enter", {
    ...options,
    keyEventText: "\r\n",
  });
}

export async function keyDelete(targetId, options = {}) {
  await pressKey(targetId, "Delete", "Delete", {
    ...options,
    keyEventCommands: ["Delete"],
  });
}

export async function keyBackspace(targetId, options = {}) {
  await pressKey(targetId, "Backspace", "Backspace", {
    ...options,
    keyEventCommands: ["BackwardDelete"],
  });
}

/**
 * ----------------------------------------------------------------------------
 * Cursor
 * ----------------------------------------------------------------------------
 */

export async function focusHome(targetId, options = {}) {
  await pressKey(targetId, "ArrowUp", "ArrowUp", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["MoveToBeginningOfDocument"],
  });

  return true;
}

export async function focusEnd(targetId, options = {}) {
  await pressKey(targetId, "ArrowDown", "ArrowDown", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["MoveToEndOfDocument"],
  });

  return true;
}

export async function focusLineStart(targetId, options = {}) {
  await pressKey(targetId, "ArrowLeft", "ArrowLeft", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["MoveToBeginningOfLine"],
  });

  return true;
}

export async function focusLineEnd(targetId, options = {}) {
  await pressKey(targetId, "ArrowRight", "ArrowRight", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["MoveToEndOfLine"],
  });

  return true;
}

export async function focusLeft(targetId, options = {}) {
  await pressKey(targetId, "ArrowLeft", "ArrowLeft", {
    ...options,
    keyEventCommands: ["MoveLeft"],
  });

  return true;
}

export async function focusRight(targetId, options = {}) {
  await pressKey(targetId, "ArrowRight", "ArrowRight", {
    ...options,
    keyEventCommands: ["MoveRight"],
  });

  return true;
}

export async function focusUp(targetId, options = {}) {
  await pressKey(targetId, "ArrowUp", "ArrowUp", {
    ...options,
    keyEventCommands: ["MoveUp"],
  });

  return true;
}

export async function focusDown(targetId, options = {}) {
  await pressKey(targetId, "ArrowDown", "ArrowDown", {
    ...options,
    keyEventCommands: ["MoveDown"],
  });

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Scroll
 * ----------------------------------------------------------------------------
 */

export async function scrollTop(targetId, options = {}) {
  await pressKey(targetId, "ArrowUp", "ArrowUp", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["ScrollToBeginningOfDocument"],
  });

  return true;
}

export async function scrollBottom(targetId, options = {}) {
  await pressKey(targetId, "ArrowDown", "ArrowDown", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["ScrollToEndOfDocument"],
  });

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Shortcut
 * ----------------------------------------------------------------------------
 */

export async function copy(targetId, options = {}) {
  await pressKey(targetId, "c", "KeyC", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["Copy"],
  });

  return true;
}

export async function paste(targetId, options = {}) {
  await pressKey(targetId, "v", "KeyV", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["Paste"],
  });

  return true;
}

export async function select(targetId, options = {}) {
  await pressKey(targetId, "a", "KeyA", {
    ...options,
    keyEventWith: "meta",
    keyEventCommands: ["SelectAll"],
  });

  return true;
}

export async function clear(targetId, options = {}) {
  await select(targetId, options);

  await sleep(random(40, 120));
  await keyDelete(targetId, options);

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Text Input
 * ----------------------------------------------------------------------------
 */

async function textInput(targetId, text, options = {}) {
  const value = String(text);
  const max = Math.min(value.length, options.typeCount ?? 15);
  const min = Math.min(5, max);
  const typeCount = random(min, max);

  if (typeCount > 0) {
    const typeText = value.slice(0, typeCount);

    for (const char of typeText) {
      await pressKey(targetId, "", "", {
        ...options,
        keyEventText: char,
      });
    }
  }

  const restText = value.slice(typeCount);

  if (restText) {
    await writeClipboard(restText);
    await sleep(random(40, 120));
    await paste(targetId, options);
  }

  return true;
}

export async function appendText(targetId, selector, text, options = {}) {
  await scrollIntoView(targetId, selector, options);
  await waitEditable(targetId, selector, options);

  await focus(targetId, selector, options);

  await sleep(random(40, 120));
  await focusEnd(targetId, options);

  return textInput(targetId, text, options);
}

export async function fillText(targetId, selector, text, options = {}) {
  await scrollIntoView(targetId, selector, options);
  await waitEditable(targetId, selector, options);

  await focus(targetId, selector, options);

  await sleep(random(40, 120));
  await clear(targetId, options);

  return textInput(targetId, text, options);
}
