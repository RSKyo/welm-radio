import {
  assertKeyNotExists,
  assertKeyExists,
  assertNonBlankString,
  assertNonEmptyNonBlankStringArray,
  assertNoDuplicateValues,
  isNullishOrEmpty,
  assertFunction,
} from "./assert.js";

export class ElmValueState {
  #valueStateMap = new Map();
  beforeSetStateValueHandler = null;
  afterSetStateValueHandler = null;

  get keys() {
    return Array.from(this.#valueStateMap.keys());
  }

  get values() {
    return Array.from(this.#valueStateMap.values()).map(({ value, mode }) =>
      cloneValue(value, mode),
    );
  }

  init(key, value = null, mode = 1) {
    assertNonBlankString(key, "key");
    assertKeyNotExists(key, this.#valueStateMap, "key");
    assertModeValue(value, mode);

    this.#valueStateMap.set(key, {
      mode,
      value: cloneValue(value, mode),
    });
  }

  get(key) {
    assertNonBlankString(key, "key");
    assertKeyExists(key, this.#valueStateMap, "key");
    const state = this.#valueStateMap.get(key);

    return { mode: state.mode, value: cloneValue(state.value, state.mode) };
  }

  getValue(key) {
    assertNonBlankString(key, "key");
    assertKeyExists(key, this.#valueStateMap, "key");
    const state = this.#valueStateMap.get(key);

    return cloneValue(state.value, state.mode);
  }

  getMode(key) {
    assertNonBlankString(key, "key");
    assertKeyExists(key, this.#valueStateMap, "key");
    const state = this.#valueStateMap.get(key);

    return state.mode;
  }

  set(key, value) {
    assertNonBlankString(key, "key");
    assertKeyExists(key, this.#valueStateMap, "key");

    const state = this.#valueStateMap.get(key);
    assertModeValue(value, state.mode);

    const mode = state.mode;
    const oldValue = cloneValue(state.value, mode);
    const newValue = cloneValue(value, mode);

    if (isEqualValue(newValue, oldValue)) {
      return;
    }

    this.beforeSetStateValue({
      key,
      mode,
      oldValue: cloneValue(oldValue, mode),
      newValue: cloneValue(newValue, mode),
    });

    state.value = cloneValue(newValue, mode);

    this.afterSetStateValue({
      key,
      mode,
      oldValue: cloneValue(oldValue, mode),
      newValue: cloneValue(newValue, mode),
    });
  }

  beforeSetStateValue(state) {
    this.beforeSetStateValueHandler?.(state);
  }

  afterSetStateValue(state) {
    this.afterSetStateValueHandler?.(state);
  }

  each(callback) {
    assertFunction(callback, "callback");
    for (const [key, { value, mode }] of this.#valueStateMap.entries()) {
      callback({ key, value: cloneValue(value, mode), mode });
    }
  }
}

function cloneValue(value, mode) {
  if (isNullishOrEmpty(value)) {
    return null;
  }

  return mode === 2 ? [...value] : value;
}

function isEqualValue(value1, value2) {
  if (value1 == null || value2 == null) {
    return value1 == null && value2 == null;
  }

  if (typeof value1 === "string" && typeof value2 === "string") {
    return value1 === value2;
  }

  if (Array.isArray(value1) && Array.isArray(value2)) {
    if (value1.length !== value2.length) {
      return false;
    }

    const sortedValues1 = [...value1].sort();
    const sortedValues2 = [...value2].sort();

    return sortedValues1.every(
      (value, index) => value === sortedValues2[index],
    );
  }

  return false;
}

function assertModeValue(value, valueMode = 1) {
  if (![1, 2].includes(valueMode)) {
    throw new Error(`invalid valueMode: ${valueMode}`);
  }

  if (isNullishOrEmpty(value)) {
    return;
  }

  if (valueMode === 1) {
    assertNonBlankString(value, "value");
  } else {
    assertNonEmptyNonBlankStringArray(value, "value");
    assertNoDuplicateValues(value, "value");
  }
}
