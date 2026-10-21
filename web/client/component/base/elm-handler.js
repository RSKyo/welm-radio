import {
  assertNonBlankString,
  assertFunction,
  assertPlainObject,
} from "./assert.js";

export class ElmHandler {
  #handlerMap = new Map();

  set(key, handler) {
    assertNonBlankString(key, "key");
    assertFunction(handler, "handler");

    this.#handlerMap.set(key, handler);
  }

  emit(key, detail = {}) {
    assertNonBlankString(key, "key");

    const handler = this.#handlerMap.get(key);

    if (!handler) {
      return;
    }

    handler(detail);
  }

  delete(key = null) {
    if (key != null) {
      assertNonBlankString(key, "key");
      return this.#handlerMap.delete(key);
    }

    this.#handlerMap.clear();
  }
}
