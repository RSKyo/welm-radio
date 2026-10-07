export * from "../../js/assert.js";

export function assertValueForMode(value, mode = 1) {
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
