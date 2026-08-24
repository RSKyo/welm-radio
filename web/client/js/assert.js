import * as is from "./is.js";
export * from "./is.js";

// -----------------------------------------------------------------------------
// common environment
// -----------------------------------------------------------------------------

/** Required */

export function assertRequired(value, fieldName = "value") {
  if (is.isNullish(value)) {
    throw new Error(`${fieldName} is required`);
  }
}

/** String */

export function assertString(value, fieldName = "value") {
  if (!is.isString(value)) {
    throw new Error(`${fieldName} must be a string`);
  }
}

export function assertNonBlankString(value, fieldName = "value") {
  if (!is.isNonBlankString(value)) {
    throw new Error(`${fieldName} must not be blank`);
  }
}

/** Number */

export function assertNumber(value, fieldName = "value") {
  if (!is.isNumber(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
}

export function assertInteger(value, fieldName = "value") {
  if (!is.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
}

export function assertPositive(value, fieldName = "value") {
  if (!is.isPositive(value)) {
    throw new Error(`${fieldName} must be a positive number`);
  }
}

export function assertNegative(value, fieldName = "value") {
  if (!is.isNegative(value)) {
    throw new Error(`${fieldName} must be a negative number`);
  }
}

export function assertNonNegative(value, fieldName = "value") {
  if (!is.isNonNegative(value)) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
}

export function assertNonPositive(value, fieldName = "value") {
  if (!is.isNonPositive(value)) {
    throw new Error(`${fieldName} must be a non-positive number`);
  }
}

export function assertPositiveInteger(value, fieldName = "value") {
  if (!is.isPositiveInteger(value)) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

export function assertNonNegativeInteger(value, fieldName = "value") {
  if (!is.isNonNegativeInteger(value)) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
}

export function assertNegativeInteger(value, fieldName = "value") {
  if (!is.isNegativeInteger(value)) {
    throw new Error(`${fieldName} must be a negative integer`);
  }
}

export function assertNonPositiveInteger(value, fieldName = "value") {
  if (!is.isNonPositiveInteger(value)) {
    throw new Error(`${fieldName} must be a non-positive integer`);
  }
}

/** Boolean */

export function assertBoolean(value, fieldName = "value") {
  if (!is.isBoolean(value)) {
    throw new Error(`${fieldName} must be a boolean`);
  }
}

/** Array */

export function assertArray(arr, fieldName = "arr") {
  if (!is.isArray(arr)) {
    throw new Error(`${fieldName} must be an array`);
  }
}

export function assertNonEmptyArray(arr, fieldName = "arr") {
  if (!is.isNonEmptyArray(arr)) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }
}

export function assertNonBlankStringArray(arr, fieldName = "arr") {
  if (!is.isNonBlankStringArray(arr)) {
    throw new Error(`${fieldName} must be an array of non-blank strings`);
  }
}

export function assertNonEmptyNonBlankStringArray(arr, fieldName = "arr") {
  if (!is.isNonEmptyNonBlankStringArray(arr)) {
    throw new Error(
      `${fieldName} must be a non-empty array of non-blank strings`,
    );
  }
}

export function assertNonBlankStringOrArray(value, fieldName = "value") {
  if (!is.isNonBlankString(value) && !is.isNonBlankStringArray(value)) {
    throw new Error(
      `${fieldName} must be a non-blank string or an array of non-blank strings`,
    );
  }
}

export function assertNonBlankStringOrNonEmptyArray(
  value,
  fieldName = "value",
) {
  if (!is.isNonBlankString(value) && !is.isNonEmptyNonBlankStringArray(value)) {
    throw new Error(
      `${fieldName} must be a non-blank string or a non-empty array of non-blank strings`,
    );
  }
}

export function assertPlainObjectArray(arr, fieldName = "arr", ...fields) {
  if (!is.isPlainObjectArray(arr)) {
    throw new Error(`${fieldName} must be an array of plain objects`);
  }

  assertFieldsInPlainObjectArray(arr, ...fields);
}

export function assertNonEmptyPlainObjectArray(
  arr,
  fieldName = "arr",
  ...fields
) {
  if (!is.isNonEmptyPlainObjectArray(arr)) {
    throw new Error(`${fieldName} must be a non-empty array of plain objects`);
  }

  assertFieldsInPlainObjectArray(arr, ...fields);
}

export function assertPlainObjectOrArray(
  value,
  fieldName = "value",
  ...fields
) {
  if (!is.isPlainObject(value) && !is.isPlainObjectArray(value)) {
    throw new Error(
      `${fieldName} must be a plain object or an array of plain objects`,
    );
  }

  const objs = is.isArray(value) ? value : [value];
  assertFieldsInPlainObjectArray(objs, ...fields);
}

export function assertPlainObjectOrNonEmptyArray(
  value,
  fieldName = "value",
  ...fields
) {
  if (!is.isPlainObject(value) && !is.isNonEmptyPlainObjectArray(value)) {
    throw new Error(
      `${fieldName} must be a plain object or a non-empty array of plain objects`,
    );
  }

  const objs = is.isArray(value) ? value : [value];
  assertFieldsInPlainObjectArray(objs, ...fields);
}

function assertFieldsInPlainObjectArray(arr, ...fields) {
  for (const obj of arr) {
    for (const field of fields) {
      assertKeyExists(field, obj, "field");
    }
  }
}

/** Object */

export function assertPlainObject(obj, fieldName = "obj", ...fields) {
  if (!is.isPlainObject(obj)) {
    throw new Error(`${fieldName} must be a plain object`);
  }

  for (const field of fields) {
    assertKeyExists(field, obj, "field");
  }
}

export function assertStringPlainObject(obj, fieldName = "obj") {
  assertPlainObject(obj, fieldName);

  for (const [key, value] of Object.entries(obj)) {
    assertString(value, `${fieldName}.${key}`);
  }
}

/** Function */

export function assertFunction(value, fieldName = "value") {
  if (!is.isFunction(value)) {
    throw new Error(`${fieldName} must be a function`);
  }
}

/** URL */

export function assertUrl(value, fieldName = "value") {
  if (!is.isValidUrl(value)) {
    throw new Error(`${fieldName} must be a valid URL`);
  }
}

export function assertHttpUrl(value, fieldName = "value") {
  if (!is.isHttpUrl(value)) {
    throw new Error(`${fieldName} must be an HTTP or HTTPS URL`);
  }
}

/** Key assertions */

// Key existence assertions
export function assertKeyExists(key, target, fieldName = "key") {
  assertNonBlankString(key, fieldName);

  if (!hasKey(target, key)) {
    throw new Error(`${fieldName} not found: ${key}`);
  }
}

// Key non-existence assertions
export function assertKeyNotExists(key, target, fieldName = "key") {
  assertNonBlankString(key, fieldName);

  if (hasKey(target, key)) {
    throw new Error(`${fieldName} already exists: ${key}`);
  }
}

function hasKey(target, key) {
  if (is.isPlainObject(target)) {
    return Object.hasOwn(target, key);
  }

  if (is.isMap(target)) {
    return target.has(key);
  }

  throw new Error("target must be a plain object or a Map");
}

/** Value assertions */

// Uint8Array
export function assertUint8Array(value, fieldName = "value") {
  if (!is.isUint8Array(value)) {
    throw new Error(`${fieldName} must be a Uint8Array`);
  }
}

// Base64
export function assertBase64(base64, fieldName = "base64") {
  if (!is.isString(base64)) {
    throw new Error(`${fieldName} must be a string`);
  }

  const clean = base64.replace(/^data:[^,]*;base64,/, "").replace(/\s+/g, "");

  if (clean.length % 4 === 1) {
    throw new Error(`invalid ${fieldName}`);
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
    throw new Error(`invalid ${fieldName}`);
  }

  return clean;
}

// Value existence assertions
export function assertValueExists(value, target, fieldName = "value") {
  if (!hasValue(target, value)) {
    throw new Error(`${fieldName} not found: ${value}`);
  }
}

// Value non-existence assertions
export function assertValueNotExists(value, target, fieldName = "value") {
  if (hasValue(target, value)) {
    throw new Error(`${fieldName} already exists: ${value}`);
  }
}

// SameValue means NaN = NaN, +0 != -0, and all other values are compared by ===
// SameValue is used by: Object.is()
// SameValueZero means NaN = NaN, +0 = -0, and all other values are compared by ===
// SameValueZero is used by: Array.includes(), Set.has(), Map.has()
function hasValue(target, value) {
  if (is.isArray(target)) {
    return target.includes(value);
  }

  if (is.isSet(target)) {
    return target.has(value);
  }

  if (is.isPlainObject(target)) {
    for (const key of Object.keys(target)) {
      if (is.isSameValueZero(target[key], value)) {
        return true;
      }
    }

    return false;
  }

  if (is.isMap(target)) {
    for (const item of target.values()) {
      if (is.isSameValueZero(item, value)) {
        return true;
      }
    }

    return false;
  }

  throw new Error("target must be an Array, a Set, a Plain Object, or a Map");
}

// Value in array assertions
export function assertValueIn(value, values, fieldName = "value") {
  assertArray(values, "values");

  if (!values.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${values.join(", ")}`);
  }
}

/** Time assertions */

// Time in seconds (with up to 3 decimal places)
export function assertTimeInSeconds(seconds, fieldName = "seconds") {
  assertNonNegative(seconds, fieldName);

  const decimalLength = String(seconds).split(".")[1]?.length ?? 0;

  if (decimalLength > 3) {
    throw new Error(`${fieldName} must have at most 3 decimal places`);
  }
}

/** Duplicate value assertions */

export function assertNoDuplicateValues(values, fieldName = "values") {
  assertArray(values, fieldName);

  const seen = new Set(values);
  if (seen.size !== values.length) {
    throw new Error(`${fieldName} contains duplicate values`);
  }
}

export function assertNoDuplicatePlainObjectValues(
  objs,
  valueField,
  fieldName = "values",
) {
  assertPlainObjectArray(objs, fieldName);
  assertNonBlankString(valueField, "valueField");
  for (const item of objs) {
    assertKeyExists(valueField, item, "valueField");
  }

  const valueFieldValues = objs.map((item) => item[valueField]);

  assertNoDuplicateValues(valueFieldValues, fieldName);
}

// -----------------------------------------------------------------------------
// for web environment
// -----------------------------------------------------------------------------

// Assertions related to HTML elements
export function assertHtmlElement(value, fieldName = "value") {
  if (!is.isHtmlElement(value)) {
    throw new Error(`${fieldName} must be an HTML element`);
  }
}

// Assertions related to iframe and DOM element nodes
export function assertElementNode(value, fieldName = "value") {
  if (!is.isElementNode(value)) {
    throw new Error(`${fieldName} must be an element node`);
  }
}

// Assertions related to selectors and HTML elements
export function assertSelectorOrHtmlElement(value, fieldName = "value") {
  if (!is.isNonBlankString(value) && !is.isHtmlElement(value)) {
    throw new Error(
      `${fieldName} must be a non-blank selector string or an HTML element`,
    );
  }
}

// Assertions related to selectors and element nodes
export function assertSelectorOrElementNode(value, fieldName = "value") {
  if (!is.isNonBlankString(value) && !is.isElementNode(value)) {
    throw new Error(
      `${fieldName} must be a non-blank selector string or an element node`,
    );
  }
}

// Assertions related to element matching and containment
export function assertElementMatches(element, selector, fieldName = "element") {
  assertHtmlElement(element, fieldName);
  assertNonBlankString(selector, "selector");

  if (!element.matches(selector)) {
    throw new Error(`${fieldName} does not match the selector: ${selector}`);
  }
}

// Assertions related to element containment
export function assertElementContains(
  element,
  selector,
  fieldName = "element",
) {
  assertHtmlElement(element, fieldName);
  assertNonBlankString(selector, "selector");

  if (!element.querySelector(selector)) {
    throw new Error(
      `${fieldName} does not contain an element matching the selector: ${selector}`,
    );
  }
}