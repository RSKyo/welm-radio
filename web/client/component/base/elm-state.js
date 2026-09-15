import {
  assertKeyNotExists,
  assertKeyExists,
  assertNonBlankString,
  assertNonEmptyNonBlankStringArray,
  assertNoDuplicateValues,
  isNullishOrEmpty,
  assertFunction,
} from "./assert.js";
import { isEqualValue } from "./elm-helper.js";

export class ElmValueState {
  #valueStateMap = new Map();
  #beforeValueStateSet = null;
  #afterValueStateSet = null;

  set beforeValueStateSet(handler) {
    assertFunction(handler, "beforeValueStateSet");

    if (this.#beforeValueStateSet !== null) {
      throw new Error("beforeValueStateSet has already been set");
    }

    this.#beforeValueStateSet = handler;
  }

  set afterValueStateSet(handler) {
    assertFunction(handler, "afterValueStateSet");

    if (this.#afterValueStateSet !== null) {
      throw new Error("afterValueStateSet has already been set");
    }

    this.#afterValueStateSet = handler;
  }

  get size() {
    return this.#valueStateMap.size;
  }

  get keys() {
    return Array.from(this.#valueStateMap.keys());
  }

  define(key, value = null, mode = 1) {
    assertNonBlankString(key, "key");
    assertKeyNotExists(key, this.#valueStateMap, "key");
    this.#assertValueForMode(value, mode);

    this.#valueStateMap.set(key, {
      mode,
      value: this.#normalizeValue(value, mode),
    });
  }

  has(key) {
    assertNonBlankString(key, "key");

    return this.#valueStateMap.has(key);
  }

  get(key) {
    assertNonBlankString(key, "key");
    assertKeyExists(key, this.#valueStateMap, "key");
    const state = this.#valueStateMap.get(key);

    return {
      mode: state.mode,
      value: this.#normalizeValue(state.value, state.mode),
    };
  }

  getMode(key) {
    assertNonBlankString(key, "key");
    assertKeyExists(key, this.#valueStateMap, "key");
    const state = this.#valueStateMap.get(key);

    return state.mode;
  }

  getValue(key) {
    assertNonBlankString(key, "key");
    assertKeyExists(key, this.#valueStateMap, "key");
    const state = this.#valueStateMap.get(key);

    return this.#normalizeValue(state.value, state.mode);
  }

  setValue(key, value) {
    assertNonBlankString(key, "key");
    assertKeyExists(key, this.#valueStateMap, "key");

    const state = this.#valueStateMap.get(key);
    this.#assertValueForMode(value, state.mode);

    const mode = state.mode;
    const oldValue = this.#normalizeValue(state.value, mode);
    const newValue = this.#normalizeValue(value, mode);

    if (isEqualValue(newValue, oldValue)) {
      return;
    }

    this.#beforeValueStateSet?.({
      key,
      mode,
      oldValue: this.#normalizeValue(oldValue, mode),
      newValue: this.#normalizeValue(newValue, mode),
    });

    state.value = this.#normalizeValue(newValue, mode);

    this.#afterValueStateSet?.({
      key,
      mode,
      oldValue: this.#normalizeValue(oldValue, mode),
      newValue: this.#normalizeValue(newValue, mode),
    });
  }

  remove(key) {
    assertNonBlankString(key, "key");

    return this.#valueStateMap.delete(key);
  }

  forEach(callback) {
    assertFunction(callback, "callback");
    for (const [key, { value, mode }] of this.#valueStateMap.entries()) {
      callback({ key, value: this.#normalizeValue(value, mode), mode });
    }
  }

  clear() {
    this.#valueStateMap.clear();
  }

  #normalizeValue(value, mode) {
    if (isNullishOrEmpty(value)) {
      return null;
    }

    return mode === 2 ? [...value] : value;
  }

  #assertValueForMode(value, mode = 1) {
    if (![1, 2].includes(mode)) {
      throw new Error(`invalid mode: ${mode}`);
    }

    if (value == null) {
      return;
    }

    if (mode === 1) {
      if (Array.isArray(value)) {
        throw new Error("value must not be an array when mode is 1");
      }

      return;
    }

    if (!Array.isArray(value)) {
      throw new Error("value must be an array when mode is 2");
    }

    if (value.length === 0) {
      return;
    }

    assertNoDuplicateValues(value, "value");
  }
}
