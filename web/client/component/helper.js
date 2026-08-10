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

/**
 * Validate an item and return it unchanged.
 */
export function assertItem(item, textField, valueField) {
  if (!isPlainObject(item)) {
    throw new Error("item must be a plain object");
  }

  if (!isNonBlankString(textField)) {
    throw new Error("textField must be a non-blank string");
  }

  if (!isNonBlankString(valueField)) {
    throw new Error("valueField must be a non-blank string");
  }

  if (!Object.hasOwn(item, textField)) {
    throw new Error(`item is missing the ${textField} field`);
  }

  if (!Object.hasOwn(item, valueField)) {
    throw new Error(`item is missing the ${valueField} field`);
  }

  if (!isNonBlankString(item[textField])) {
    throw new Error(`item.${textField} must be a non-blank string`);
  }

  if (!isNonBlankString(item[valueField])) {
    throw new Error(`item.${valueField} must be a non-blank string`);
  }

  return item;
}

/**
 * Validate an item array and ensure that all item values are unique.
 */
export function assertItems(items, textField, valueField) {
  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }

  const values = new Set();

  for (const item of items) {
    assertItem(item, textField, valueField);

    const value = item[valueField];

    if (values.has(value)) {
      throw new Error(`duplicate item value: ${value}`);
    }

    values.add(value);
  }

  return items;
}

/**
 * Validate an optional value against an item array.
 *
 * A null or undefined value returns null.
 * Any other value must be a non-blank string and exist in the item array.
 */
export function assertValue(value, items, valueField) {
  if (value == null) {
    return null;
  }

  if (!isNonBlankString(value)) {
    throw new Error("value must be a non-blank string");
  }

  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }

  if (!isNonBlankString(valueField)) {
    throw new Error("valueField must be a non-blank string");
  }

  if (!items.some((item) => item[valueField] === value)) {
    throw new Error(`value not found: ${value}`);
  }

  return value;
}

/**
 * Validate an optional array of unique values against an item array.
 *
 * A null or undefined value represents no selection and returns an empty array.
 * Every provided value must be a non-blank string and exist in the item array.
 */
export function assertValues(values, items, valueField) {
  if (values == null) {
    return [];
  }

  if (!Array.isArray(values)) {
    throw new Error("values must be an array");
  }

  for (const value of values) {
    if (!isNonBlankString(value)) {
      throw new Error("values must be non-blank strings");
    }
  }

  if (values.length !== new Set(values).size) {
    throw new Error("values must not contain duplicates");
  }

  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }

  if (!isNonBlankString(valueField)) {
    throw new Error("valueField must be a non-blank string");
  }

  for (const value of values) {
    if (!items.some((item) => item[valueField] === value)) {
      throw new Error(`value not found: ${value}`);
    }
  }

  return values;
}

/**
 * Keep a value only when it exists in the item array.
 *
 * Invalid and unavailable values return null instead of throwing an error.
 */
export function filterValue(value, items, valueField) {
  try {
    assertValue(value, items, valueField);
    return value;
  } catch {
    return null;
  }
}

/**
 * Keep only values that exist in the item array.
 *
 * Duplicate and unavailable values are removed.
 * Invalid values return an empty array instead of throwing an error.
 */
export function filterValues(values, items, valueField) {
  if (!Array.isArray(values)) {
    return [];
  }

  const filteredValues = new Set();

  for (const value of values) {
    const filteredValue = filterValue(value, items, valueField);

    if (filteredValue !== null) {
      filteredValues.add(filteredValue);
    }
  }

  return [...filteredValues];
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

/**
 * Prepare a root element reference and return the corresponding HTMLElement.
 *
 * Optionally adds a root CSS class to the element.
 *
 * The element can be:
 *
 * - An element ID string (with or without the leading "#").
 * - An HTMLElement instance.
 *
 * @throws {Error}
 * When the element is missing, invalid, or the target element cannot be found.
 */
export function prepareRootElement(element, rootClass) {
  if (element == null) {
    throw new Error("element must be provided");
  }

  if (rootClass != null && !isNonBlankString(rootClass)) {
    throw new Error("rootClass must be a non-blank string");
  }

  let el;

  if (isNonBlankString(element)) {
    const selector = element.startsWith("#") ? element : `#${element}`;

    el = document.querySelector(selector);

    if (!el) {
      throw new Error(`element not found: ${selector}`);
    }
  } else if (element instanceof HTMLElement) {
    el = element;
  } else {
    throw new Error("element must be a non-blank string or an HTMLElement");
  }

  if (rootClass) {
    el.classList.add(rootClass);
  }

  return el;
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
