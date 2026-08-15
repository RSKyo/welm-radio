import { Toast } from "../component/toast.js";
import { Elm } from "../component/elm.js";

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
    if (typeof target === "string" || target instanceof Element) {
      const element =
        target instanceof Element ? target : document.querySelector(target);
      if (!element) {
        throw new Error(`Element not found for selector: ${target}`);
      }

      const eventHandler = safeHandler(handler);

      element.addEventListener(name, eventHandler);

      return () => {
        element.removeEventListener(name, eventHandler);
      };
    }

    if (target instanceof Elm) {
      const elmName = target.dataset.name ?? "object";
      const eventName = `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;

      if (!(eventName in target)) {
        throw new Error(`Elm ${elmName} does not have event: ${eventName}`);
      }

      const eventHandler = safeHandler(handler);

      target[eventName] = eventHandler;

      return () => {
        target[eventName] = null;
      };
    }

    throw new Error(`Invalid event target: ${String(target)}`);
  },
  click: (target, handler) => {
    return on.bindEvent(target, "click", handler);
  },
  dblclick: (target, handler) => {
    return on.bindEvent(target, "dblclick", handler);
  },
  change: (target, handler) => {
    return on.bindEvent(target, "change", handler);
  },
  // elm event only
  checkedChange: (target, handler) => {
    return on.bindEvent(target, "checkedChange", handler);
  },
};
