import { assertNonBlankString, assertFunction } from "./assert.js";
export class ElmHandler {
  #handlerMap = new Map();

  on(key, handler) {
    assertNonBlankString(key, "key");
    assertFunction(handler, "handler");

    let handlers = this.#handlerMap.get(key);

    if (!handlers) {
      handlers = new Set();
      this.#handlerMap.set(key, handlers);
    }

    handlers.add(handler);
  }

  emit(key, detail = {}) {
    assertNonBlankString(key, "key");

    const handlers = this.#handlerMap.get(key);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(detail);
    }
  }

  off(key = null, handler = null) {
    if (key == null) {
      this.#handlerMap.clear();
      return;
    }

    assertNonBlankString(key, "key");

    if (handler == null) {
      this.#handlerMap.delete(key);
      return;
    }

    assertFunction(handler, "handler");

    const handlers = this.#handlerMap.get(key);

    if (!handlers) {
      return;
    }

    handlers.delete(handler);

    if (handlers.size === 0) {
      this.#handlerMap.delete(key);
    }
  }
}