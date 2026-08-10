// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

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

export function validateValues(values, items, valueField) {
  if (values == null) {
    return;
  }

  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("values must be a non-empty array");
  }

  const itemValues = items.map((item) => item[valueField]);

  for (const v of values) {
    if (!isNonBlankString(v)) {
      throw new Error("value array must contain only non-blank strings");
    }

    if (!itemValues.includes(v)) {
      throw new Error(`value not found: ${v}`);
    }
  }
}

export function validateValue(value, items, valueField) {
  if (value == null) {
    return;
  }

  if (!isNonBlankString(value)) {
    throw new Error("value must be a non-blank string");
  }

  if (!items.some((item) => item[valueField] === value)) {
    throw new Error(`value not found: ${value}`);
  }
}

/**
 * Check whether two value arrays contain the same values.
 *
 * The comparison ignores value order.
 * Both arrays must contain the same number of values.
 *
 * @throws {Error}
 * When either argument is not an array.
 */
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

// -----------------------------------------------------------------------------
// Private Helpers
// -----------------------------------------------------------------------------

function isNonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}
