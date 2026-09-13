import {
  assertNonBlankString,
  assertFunction,
  assertPlainObject,
} from "./assert.js";

export class ElmHandlerRegistry {
  #handlerMap = new Map();

  get size() {
    return this.#handlerMap.size;
  }

  get keys() {
    return Array.from(this.#handlerMap.keys());
  }

  has(key) {
    assertNonBlankString(key, "key");

    return this.#handlerMap.has(key);
  }

  get(key) {
    assertNonBlankString(key, "key");

    return this.#handlerMap.get(key) ?? null;
  }

  set(key, handler) {
    assertNonBlankString(key, "key");
    assertFunction(handler, "handler");

    this.#handlerMap.set(key, handler);
  }

  remove(key) {
    assertNonBlankString(key, "key");

    return this.#handlerMap.delete(key);
  }

  emit(key, detail = {}) {
    assertNonBlankString(key, "key");
    assertPlainObject(detail, "detail");

    const handler = this.#handlerMap.get(key);

    if (!handler) {
      return;
    }

    handler(detail);
  }

  clear() {
    this.#handlerMap.clear();
  }
}
