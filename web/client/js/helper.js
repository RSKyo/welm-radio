import { Toast } from "../component/toast.js";
import { Elm } from "../component/base/elm.js";
import {
  isNonBlankString,
  isHtmlElement,
  assertNonBlankString,
  assertHtmlElement,
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

const DOM_EVENT_NAMES = [
  "click",
  "dblclick",
  "change",
  "input",
  "focus",
  "blur",
  "resize",
  "scroll",
  "keydown",
  "keyup",
  "keypress",
  "mousemove",
  "mousedown",
  "mouseup",
  "mouseenter",
  "mouseleave",
  
];

// export const on = {
//   /** Dom events */

//   click: (target, handler) => {
//     return bindEvent(target, "click", handler);
//   },
//   dblclick: (target, handler) => {
//     return bindEvent(target, "dblclick", handler);
//   },
//   change: (target, handler) => {
//     return bindEvent(target, "change", handler);
//   },
//   input: (target, handler) => {
//     return bindEvent(target, "input", handler);
//   },
//   focus: (target, handler) => {
//     return bindEvent(target, "focus", handler);
//   },
//   blur: (target, handler) => {
//     return bindEvent(target, "blur", handler);
//   },
//   keydown: (target, handler) => {
//     return bindEvent(target, "keydown", handler);
//   },
//   keyup: (target, handler) => {
//     return bindEvent(target, "keyup", handler);
//   },
//   keypress: (target, handler) => {
//     return bindEvent(target, "keypress", handler);
//   },
//   mousemove: (target, handler) => {
//     return bindEvent(target, "mousemove", handler);
//   },
//   mousedown: (target, handler) => {
//     return bindEvent(target, "mousedown", handler);
//   },
//   mouseup: (target, handler) => {
//     return bindEvent(target, "mouseup", handler);
//   },
//   mouseenter: (target, handler) => {
//     return bindEvent(target, "mouseenter", handler);
//   },
//   mouseleave: (target, handler) => {
//     return bindEvent(target, "mouseleave", handler);
//   },

//   /** Elm events */

//   selectedChange: (target, handler) => {
//     return bindEvent(target, "selectedChange", handler);
//   },
//   checkedChange: (target, handler) => {
//     return bindEvent(target, "checkedChange", handler);
//   },
//   doubleClick: (target, handler) => {
//     return bindEvent(target, "doubleClick", handler);
//   },
// };

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
  if (!DOM_EVENT_NAMES.includes(eventName)) {
    throw new Error(`Unsupported DOM event: ${eventName}`);
  }

  const eventHandler = safeHandler(handler);
  if (eventName === "resize") {
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
