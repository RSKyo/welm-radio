import { Toast } from "../component/toast.js";
import { Elm } from "../component/base/elm.js";
import {
  isNonBlankString,
  isHtmlElement,
  assertNonBlankString,
  assertHtmlElement,
  assertNumber,
  assertNonNegative,
  isNullish,
  isNullishOrEmpty,
  assertNonNegativeInteger,
  assertPlainObject,
} from "./assert.js";

const TIME_PRECISION = 3;
const PIXEL_PRECISION = 2;

export const toast = new Toast();

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clonePlainObject(value) {
  assertPlainObject(value, "value");
  return structuredClone(value);
}

/**
 * Run a handler safely and report any error through the global toast.
 *
 * Both synchronous and asynchronous handlers are supported.
 * Any thrown error or rejected promise is caught, logged to the console,
 * and displayed through `toast.error()`.
 *
 * @param {Function} handler
 * Handler function to execute.
 *
 * @param {...*} args
 * Arguments passed to the handler.
 *
 * @returns {Promise<*>}
 * The handler result, or `undefined` if an error occurs.
 */
export async function safeRun(handler, ...args) {
  try {
    if (typeof handler !== "function") {
      throw new Error("handler must be a function");
    }

    return await handler(...args);
  } catch (error) {
    console.error(error);

    toast.error(error?.message ?? String(error));

    return undefined;
  }
}

/**
 * Wrap a handler so it is executed through `safeRun()`.
 *
 * The returned function forwards all arguments to the original handler and
 * ensures synchronous errors and asynchronous rejections are handled by
 * `safeRun()`.
 *
 * @param {Function} handler
 * Handler function to wrap.
 *
 * @returns {Function}
 * A wrapped handler that returns the promise produced by `safeRun()`.
 */
export function safeHandler(handler) {
  if (typeof handler !== "function") {
    throw new Error("handler must be a function");
  }

  return (...args) => safeRun(handler, ...args);
}

// -----------------------------------------------------------------------------
// normalization functions
// -----------------------------------------------------------------------------

export function normalizeTime(value) {
  return Number(value.toFixed(TIME_PRECISION));
}

export function normalizePixel(value) {
  return Number(value.toFixed(PIXEL_PRECISION));
}

export function normalizeArray(value) {
  if (isNullish(value)) {
    return [[], false];
  }
  return Array.isArray(value) ? [value, true] : [[value], false];
}

export function normalizeValue(value, mode = 1) {
  if (isNullishOrEmpty(value)) {
    return null;
  }
  return mode === 2 ? [...value] : value;
}

// -----------------------------------------------------------------------------
// binding events
// -----------------------------------------------------------------------------

export function on(target, eventName, handler) {
  if (target == window) {
    return bindDomEvent(window, eventName, handler);
  }

  if (isNonBlankString(target)) {
    const element = target.startsWith("#")
      ? document.getElementById(target.slice(1))
      : document.querySelector(target);
    assertHtmlElement(element, "target");

    return bindDomEvent(element, eventName, handler);
  }

  if (isHtmlElement(target)) {
    return bindDomEvent(target, eventName, handler);
  }

  return bindObjEvent(target, eventName, handler);
}

function bindDomEvent(element, eventName, handler) {
  const eventHandler = safeHandler(handler);
  if (eventName === "resizeElement") {
    const resizeObserver = new ResizeObserver(() => {
      eventHandler();
    });
    resizeObserver.observe(element);
    return () => {
      resizeObserver.unobserve(element);
    };
  }

  element.addEventListener(eventName, eventHandler);
  return () => {
    element.removeEventListener(eventName, eventHandler);
  };
}

function bindObjEvent(obj, eventName, handler) {
  const objName = obj.rootElement?.dataset?.name ?? "object";
  const eventMethod =
    `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;

  if (typeof obj[eventMethod] !== "function") {
    throw new Error(`Elm ${objName} does not have event: ${eventMethod}`);
  }

  return obj[eventMethod](safeHandler(handler));
}

// -----------------------------------------------------------------------------
// value helpers
// -----------------------------------------------------------------------------

export function isEqualValue(value1, value2) {
  if (Object.is(value1, value2)) {
    return true;
  }

  if (value1 == null || value2 == null) {
    return false;
  }

  if (value1 instanceof Date || value2 instanceof Date) {
    return (
      value1 instanceof Date &&
      value2 instanceof Date &&
      value1.getTime() === value2.getTime()
    );
  }

  if (Array.isArray(value1) || Array.isArray(value2)) {
    if (!Array.isArray(value1) || !Array.isArray(value2)) {
      return false;
    }

    if (value1.length !== value2.length) {
      return false;
    }

    const matchedIndexes = new Set();

    return value1.every((item1) => {
      const index = value2.findIndex(
        (item2, index) =>
          !matchedIndexes.has(index) && isEqualValue(item1, item2),
      );

      if (index === -1) {
        return false;
      }

      matchedIndexes.add(index);

      return true;
    });
  }

  if (typeof value1 === "object" && typeof value2 === "object") {
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    return keys1.every(
      (key) =>
        Object.hasOwn(value2, key) && isEqualValue(value1[key], value2[key]),
    );
  }

  return false;
}

export function clampValue(
  value,
  min,
  max,
  { fixed = null, needAssert = false } = {},
) {
  if (needAssert) {
    assertNumber(value, "value");
    assertNumber(min, "min");
    assertNumber(max, "max");

    if (min > max) {
      throw new Error("min must not be greater than max");
    }

    if (fixed != null) {
      assertNonNegativeInteger(fixed, "fixed");
    }
  }
  const clampedValue = Math.min(Math.max(value, min), max);
  return fixed != null ? Number(clampedValue.toFixed(fixed)) : clampedValue;
}

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

export function createElementByHTML(html, assertionSubject = "html") {
  assertNonBlankString(html, assertionSubject);

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const elements = Array.from(template.content.children);

  if (elements.length === 0) {
    throw new Error(
      `${assertionSubject} must contain at least one root element`,
    );
  }

  for (const element of elements) {
    assertHtmlElement(element, assertionSubject);
  }

  return elements.length === 1 ? elements[0] : elements;
}

export function resolveElement(target, assertionSubject = "target") {
  if (isHtmlElement(target)) {
    return target;
  }

  assertNonBlankString(target, assertionSubject);
  target = target.trim();

  let element;

  if (target.startsWith("#")) {
    element = document.getElementById(target.slice(1));
  } else if (target.startsWith("<") && target.endsWith(">")) {
    element = createElementByHTML(target, assertionSubject);
    if (Array.isArray(element)) {
      throw new Error(
        `${assertionSubject} must contain exactly one root element`,
      );
    }
  } else {
    try {
      element = document.querySelector(target);
    } catch {
      throw new Error(
        `${assertionSubject} must be a valid CSS selector: ${target}`,
      );
    }
  }

  assertHtmlElement(element, assertionSubject);

  return element;
}

export function getBySelector(target, ...selectors) {
  const element = resolveElement(target, "target");

  const elements = selectors.map((selector) => {
    assertNonBlankString(selector, "selector");
    let el;

    try {
      el = element.querySelector(selector);
    } catch {
      throw new Error(`selector must be a valid CSS selector: ${selector}`);
    }

    assertHtmlElement(el, `element matching selector "${selector}"`);

    return el;
  });

  return selectors.length === 1 ? elements[0] : elements;
}

export function closestElement(event, selector) {
  assertNonBlankString(selector, "selector");

  const { target, currentTarget } = event;

  if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
    return null;
  }

  const element = target.closest(selector);

  if (element == null || !currentTarget.contains(element)) {
    return null;
  }

  return element;
}

// -----------------------------------------------------------------------------
// Time Operations
// -----------------------------------------------------------------------------

/**
 * Parse a time value into seconds.
 *
 * Accepts:
 * - A non-negative finite number, returned as-is.
 * - A time string in one of these formats:
 *   - SS
 *   - SS.mmm
 *   - MM:SS
 *   - MM:SS.mmm
 *   - HH:MM:SS
 *   - HH:MM:SS.mmm
 *
 * Minutes and seconds must be within 00-59 when they are not
 * the highest-order unit.
 *
 * Milliseconds may contain 1 to 3 digits and are padded to
 * millisecond precision.
 *
 * Returns null when the input is null, undefined, or an empty string.
 *
 * @param {number|string|null|undefined} value
 * Time value to parse.
 *
 * @returns {number|null}
 * Parsed time in seconds, or null when no time value is provided.
 *
 * @throws {Error}
 * Throws if the value type, numeric value, or time format is invalid.
 */
export function parseTime(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`invalid time value: ${value}`);
    }

    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`invalid time value: ${value}`);
  }

  const text = value.trim();

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let milliseconds = 0;

  let match = text.match(/^(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?$/);

  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
    seconds = Number(match[3]);
    milliseconds = Number((match[4] ?? "0").padEnd(3, "0"));

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  match = text.match(/^(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/);

  if (match) {
    minutes = Number(match[1]);
    seconds = Number(match[2]);
    milliseconds = Number((match[3] ?? "0").padEnd(3, "0"));

    return minutes * 60 + seconds + milliseconds / 1000;
  }

  match = text.match(/^(\d+)(?:\.(\d{1,3}))?$/);

  if (match) {
    seconds = Number(match[1]);
    milliseconds = Number((match[2] ?? "0").padEnd(3, "0"));

    return seconds + milliseconds / 1000;
  }

  throw new Error(`invalid time format: ${value}`);
}

/**
 * Format a non-negative time value in seconds.
 *
 * By default, returns the shortest meaningful time representation:
 * - 2.805      -> "2.805"
 * - 62.805     -> "1:02.805"
 * - 3662.805   -> "1:01:02.805"
 *
 * When `full` is true, always returns the full
 * HH:MM:SS.mmm representation:
 * - 2.805      -> "00:00:02.805"
 * - 62.805     -> "00:01:02.805"
 * - 3662.805   -> "01:01:02.805"
 *
 * The value is rounded to the nearest millisecond before formatting.
 *
 * Returns null when `seconds` is null or undefined.
 *
 * @param {number|null|undefined} seconds
 * Time value in seconds.
 *
 * @param {boolean} [full=false]
 * Whether to use the full HH:MM:SS.mmm format.
 *
 * @returns {string|null}
 * Formatted time string, or null when no time value is provided.
 *
 * @throws {Error}
 * Throws if `seconds` is not a non-negative finite number.
 */
export function formatTime(
  seconds,
  { minimumUnit = "second", milliseconds = false } = {},
) {
  if (seconds == null) {
    return null;
  }

  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`invalid time value: ${seconds}`);
  }

  if (!["second", "minute", "hour"].includes(minimumUnit)) {
    throw new Error(`invalid minimumUnit: ${minimumUnit}`);
  }

  const totalMilliseconds = Math.round(seconds * 1000);

  const millisecond = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const second = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minute = totalMinutes % 60;
  const hour = Math.floor(totalMinutes / 60);

  const secondText = String(second).padStart(2, "0");

  const fractionText = milliseconds
    ? `.${String(millisecond).padStart(3, "0")}`
    : "";

  if (hour > 0 || minimumUnit === "hour") {
    return (
      `${hour}:` +
      `${String(minute).padStart(2, "0")}:` +
      `${secondText}` +
      fractionText
    );
  }

  if (minute > 0 || minimumUnit === "minute") {
    return `${minute}:${secondText}${fractionText}`;
  }

  return `${second}${fractionText}`;
}
