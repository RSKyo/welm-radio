import { Toast } from "../component/toast.js";
import { Elm } from "../component/base/elm.js";
import {
  isNonBlankString,
  isHtmlElement,
  assertNonBlankString,
  assertHtmlElement,
  assertNumber,
  assertNonNegative,
} from "./assert.js";

export const toast = new Toast();

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
// binding events
// -----------------------------------------------------------------------------

export function on(target, eventName, handler) {
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

  if (isElmObject(target)) {
    return bindElmEvent(target, eventName, handler);
  }

  throw new Error(`Invalid target: ${String(target)}`);
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

function bindElmEvent(elm, eventName, handler) {
  const elmName = elm.rootElement?.dataset?.name ?? "object";
  const eventProp = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;

  if (!(eventProp in elm)) {
    throw new Error(`Elm ${elmName} does not have event: ${eventProp}`);
  }

  elm[eventProp] = safeHandler(handler);

  return () => {
    elm[eventProp] = null;
  };
}

function assertElmObject(target, assertionSubject = "target") {
  if (!isElmObject(target)) {
    throw new Error(`${assertionSubject} must be an Elm object`);
  }
}

function isElmObject(target) {
  return target instanceof Elm;
}

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

export function getElement(selector) {
  assertNonBlankString(selector, "selector");

  const element = selector.startsWith("#")
    ? document.getElementById(selector.slice(1))
    : document.querySelector(selector);

  assertHtmlElement(element, "selector");
  return element;
}

// -----------------------------------------------------------------------------
// Time and Position Helpers
// -----------------------------------------------------------------------------

export function timeToX(seconds, pixelsPerSecond) {
  assertNonNegative(seconds, "seconds");
  assertNonNegative(pixelsPerSecond, "pixelsPerSecond");

  return Number((seconds * pixelsPerSecond).toFixed(2));
}

export function xToTime(x, pixelsPerSecond) {
  assertNumber(x, "x");
  assertNonNegative(pixelsPerSecond, "pixelsPerSecond");

  x = x < 0 ? 0 : x;

  return Number((x / pixelsPerSecond).toFixed(3));
}

export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainSeconds = seconds % 60;

  const secondText = remainSeconds
    .toFixed(3)
    .replace(/\.?0+$/, "")
    .padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${secondText}`;
  }

  return `${String(minutes).padStart(2, "0")}:${secondText}`;
}

export function parseTime(timeText) {
  const parts = timeText.split(":").map(Number);

  if (parts.some(Number.isNaN)) {
    throw new Error(`invalid time: ${timeText}`);
  }

  let hours = 0;
  let minutes;
  let seconds;

  if (parts.length === 2) {
    [minutes, seconds] = parts;
  } else if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else {
    throw new Error(`invalid time: ${timeText}`);
  }

  if (
    hours < 0 ||
    minutes < 0 ||
    minutes >= 60 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    throw new Error(`invalid time: ${timeText}`);
  }

  return hours * 3600 + minutes * 60 + seconds;
}
