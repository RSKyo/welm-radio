import { Toast } from "../component/toast.js";
import { Elm } from "../component/base/elm.js";
import {
  isHtmlElement,
  assertHtmlElement,
  assertSelectorOrHtmlElement,
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

/**
 * Bind event handlers to DOM elements or `Elm` instances.
 *
 * DOM targets can be provided as an `Element` or selector string and are bound
 * through `addEventListener()`.
 *
 * `Elm` targets are bound through matching event properties. For example,
 * `"change"` maps to `onChange`, and `"checkedChange"` maps to
 * `onCheckedChange`.
 *
 * All handlers are wrapped with `safeHandler()`.
 *
 * Each binding method returns a function that removes the corresponding
 * handler.
 */
export const on = {
  domEvents: [
    "click",
    "dblclick",
    "change",
    "input",
    "focus",
    "blur",
    "keydown",
    "keyup",
    "keypress",
  ],
  elmEvents: ["selectedChange", "doubleClick", "checkedChange"],
  /**
   * Bind an event handler to a DOM element or `Elm` instance.
   *
   * @param {string|Element|Elm} target
   * Target element, selector, or `Elm` instance.
   *
   * @param {string} name
   * Event name.
   *
   * @param {Function} handler
   * Event handler.
   *
   * @returns {Function}
   * Function that removes the bound handler.
   */
  bindEvent: (target, name, handler) => {
    const element = resolveElement(target);

    if (element instanceof Element) {
      if (!on.domEvents.includes(name)) {
        throw new Error(`Unsupported DOM event: ${name}`);
      }

      const eventHandler = safeHandler(handler);
      element.addEventListener(name, eventHandler);

      return () => {
        element.removeEventListener(name, eventHandler);
      };
    }

    if (element instanceof Elm) {
      if (!on.elmEvents.includes(name)) {
        throw new Error(`Unsupported Elm event: ${name}`);
      }

      const elmName = element.dataset.name ?? "object";
      const eventName = `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;

      if (!(eventName in element)) {
        throw new Error(`Elm ${elmName} does not have event: ${eventName}`);
      }

      const eventHandler = safeHandler(handler);
      element[eventName] = eventHandler;

      return () => {
        element[eventName] = null;
      };
    }

    throw new Error(`Invalid event target: ${String(target)}`);
  },

  /** Dom events */

  click: (target, handler) => {
    return on.bindEvent(target, "click", handler);
  },
  dblclick: (target, handler) => {
    return on.bindEvent(target, "dblclick", handler);
  },
  change: (target, handler) => {
    return on.bindEvent(target, "change", handler);
  },
  input: (target, handler) => {
    return on.bindEvent(target, "input", handler);
  },
  focus: (target, handler) => {
    return on.bindEvent(target, "focus", handler);
  },
  blur: (target, handler) => {
    return on.bindEvent(target, "blur", handler);
  },
  keydown: (target, handler) => {
    return on.bindEvent(target, "keydown", handler);
  },
  keyup: (target, handler) => {
    return on.bindEvent(target, "keyup", handler);
  },
  keypress: (target, handler) => {
    return on.bindEvent(target, "keypress", handler);
  },

  /** Elm events */

  selectedChange: (target, handler) => {
    return on.bindEvent(target, "selectedChange", handler);
  },
  checkedChange: (target, handler) => {
    return on.bindEvent(target, "checkedChange", handler);
  },
  doubleClick: (target, handler) => {
    return on.bindEvent(target, "doubleClick", handler);
  },
};

function resolveElement(target) {
  assertSelectorOrHtmlElement(target, "target");

  if (isHtmlElement(target)) {
    return target;
  }

  const element = target.startsWith("#")
    ? document.getElementById(target.slice(1))
    : document.querySelector(target);

  assertHtmlElement(element, "target");

  return element;
}
