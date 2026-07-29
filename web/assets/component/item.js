// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Validate an item and return it unchanged.
 */
export function assertItem(item, textField = "text", valueField = "value") {
  if (!isPlainObject(item)) {
    throw new Error("item must be a plain object");
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
export function assertItems(items, textField = "text", valueField = "value") {
  if (!isArray(items)) {
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
 * A null, undefined, or empty-string value returns an empty string.
 * Any other value must be a non-blank string and exist in the item array.
 */
export function assertValue(value, items, valueField = "value") {
  if (!isArray(items)) {
    throw new Error("items must be an array");
  }

  if (value == null || value === "") {
    return "";
  }

  if (!isNonBlankString(value)) {
    throw new Error("value must be a non-blank string");
  }

  if (!items.some((item) => item[valueField] === value)) {
    throw new Error(`value not found: ${value}`);
  }

  return value;
}

/**
 * Validate an optional array of unique values against an item array.
 *
 * A null or undefined value returns an empty array.
 * Every provided value must be a non-blank string and exist in the item array.
 */
export function assertValues(values, items, valueField = "value") {
  if (!isArray(items)) {
    throw new Error("items must be an array");
  }

  if (values == null) {
    return [];
  }

  if (!isArray(values)) {
    throw new Error("values must be an array");
  }

  if (values.length !== new Set(values).size) {
    throw new Error("values must not contain duplicates");
  }

  const validatedValues = [];

  for (const value of values) {
    const validatedValue = assertValue(value, items, valueField);

    validatedValues.push(validatedValue);
  }

  return validatedValues;
}

/**
 * Keep a value only when it exists in the item array.
 *
 * Invalid and unavailable values return an empty string
 * instead of throwing an error.
 */
export function filterValue(value, items, valueField = "value") {
  if (!isNonBlankString(value) || !isArray(items)) {
    return "";
  }

  return items.some((item) => item?.[valueField] === value) ? value : "";
}

/**
 * Keep only values that exist in the item array.
 *
 * Duplicate and unavailable values are removed.
 * Invalid input returns an empty array instead of throwing an error.
 */
export function filterValues(values, items, valueField = "value") {
  if (!Array.isArray(values) || !Array.isArray(items)) {
    return [];
  }

  const itemValues = new Set(items.map((item) => item?.[valueField]));

  return [...new Set(values)].filter(
    (value) => isNonBlankString(value) && itemValues.has(value),
  );
}

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

function isArray(value) {
  return Array.isArray(value);
}

const isPlainObject = (value) => {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
};
