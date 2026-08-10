import { Toast } from "../component/toast.js";

export const toast = new Toast();

/**
 * Execute an async handler safely.
 *
 * Catches errors thrown by the handler, logs the error,
 * and displays an error message through the toast service.
 *
 * Returns the handler result on success.
 * Returns undefined when an error occurs.
 */
export async function safeRun(handler, ...args) {
  try {
    return await handler(...args);
  } catch (error) {
    console.error(error);

    toast.error(error?.message ?? String(error));

    return undefined;
  }
}

/**
 * Create a safe event handler wrapper.
 *
 * The returned handler executes the original handler through safeRun(),
 * preventing unhandled errors from escaping event callbacks.
 */
export function safeHandler(handler) {
  return (...args) => safeRun(handler, ...args);
}

export const domEvent = {
  bindEvent: (target, eventName, handler) => {
    let element = target;
    if(typeof target === "string") {
      element = document.querySelector(target);

      if (!element) {
        throw new Error(`Element not found for selector: ${target}`);
      }
    } else if (!(element instanceof Element)) {
      throw new Error(`Invalid target: ${target}`);
    }

    const _safeHandler = safeHandler(handler);
    element.addEventListener(eventName, _safeHandler);

    return () => {
      element.removeEventListener(eventName, _safeHandler);
    };
  },
  click: (element, handler) => {
    return domEvent.bindEvent(element, "click", handler);
  },
  doubleClick: (element, handler) => {
    return domEvent.bindEvent(element, "dblclick", handler);
  },
  change: (element, handler) => {
    return domEvent.bindEvent(element, "change", handler);
  },
};


export function haveSameValues(values1, values2) {
  if (!Array.isArray(values1) || !Array.isArray(values2)) {
    throw new Error("values1 and values2 must be arrays");
  }

  if (values1.length !== values2.length) {
    return false;
  }

  const sortedValues1 = [...values1].sort();
  const sortedValues2 = [...values2].sort();

  return sortedValues1.every((value, index) => value === sortedValues2[index]);
}