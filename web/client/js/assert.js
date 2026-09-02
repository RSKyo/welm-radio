import * as is from "./is.js";
export * from "./is.js";

// -----------------------------------------------------------------------------
// common environment
// -----------------------------------------------------------------------------

/** Required */

export function assertRequired(value, assertionSubject = "value") {
  if (is.isNullish(value)) {
    throw new Error(`${assertionSubject} is required`);
  }
}

/** String */

export function assertString(value, assertionSubject = "value") {
  if (!is.isString(value)) {
    throw new Error(`${assertionSubject} must be a string`);
  }
}

export function assertNonBlankString(value, assertionSubject = "value") {
  if (!is.isNonBlankString(value)) {
    throw new Error(`${assertionSubject} must not be blank`);
  }
}

/** Number */

export function assertNumber(value, assertionSubject = "value") {
  if (!is.isNumber(value)) {
    throw new Error(`${assertionSubject} must be a finite number`);
  }
}

export function assertInteger(value, assertionSubject = "value") {
  if (!is.isInteger(value)) {
    throw new Error(`${assertionSubject} must be an integer`);
  }
}

export function assertPositive(value, assertionSubject = "value") {
  if (!is.isPositive(value)) {
    throw new Error(`${assertionSubject} must be a positive number`);
  }
}

export function assertNegative(value, assertionSubject = "value") {
  if (!is.isNegative(value)) {
    throw new Error(`${assertionSubject} must be a negative number`);
  }
}

export function assertNonNegative(value, assertionSubject = "value") {
  if (!is.isNonNegative(value)) {
    throw new Error(`${assertionSubject} must be a non-negative number`);
  }
}

export function assertNonPositive(value, assertionSubject = "value") {
  if (!is.isNonPositive(value)) {
    throw new Error(`${assertionSubject} must be a non-positive number`);
  }
}

export function assertPositiveInteger(value, assertionSubject = "value") {
  if (!is.isPositiveInteger(value)) {
    throw new Error(`${assertionSubject} must be a positive integer`);
  }
}

export function assertNonNegativeInteger(value, assertionSubject = "value") {
  if (!is.isNonNegativeInteger(value)) {
    throw new Error(`${assertionSubject} must be a non-negative integer`);
  }
}

export function assertNegativeInteger(value, assertionSubject = "value") {
  if (!is.isNegativeInteger(value)) {
    throw new Error(`${assertionSubject} must be a negative integer`);
  }
}

export function assertNonPositiveInteger(value, assertionSubject = "value") {
  if (!is.isNonPositiveInteger(value)) {
    throw new Error(`${assertionSubject} must be a non-positive integer`);
  }
}

/** Boolean */

export function assertBoolean(value, assertionSubject = "value") {
  if (!is.isBoolean(value)) {
    throw new Error(`${assertionSubject} must be a boolean`);
  }
}

/** Array */

export function assertArray(arr, assertionSubject = "arr") {
  if (!is.isArray(arr)) {
    throw new Error(`${assertionSubject} must be an array`);
  }
}

export function assertNonEmptyArray(arr, assertionSubject = "arr") {
  if (!is.isNonEmptyArray(arr)) {
    throw new Error(`${assertionSubject} must be a non-empty array`);
  }
}

export function assertNonBlankStringArray(arr, assertionSubject = "arr") {
  if (!is.isNonBlankStringArray(arr)) {
    throw new Error(`${assertionSubject} must be an array of non-blank strings`);
  }
}

export function assertNonEmptyNonBlankStringArray(arr, assertionSubject = "arr") {
  if (!is.isNonEmptyNonBlankStringArray(arr)) {
    throw new Error(
      `${assertionSubject} must be a non-empty array of non-blank strings`,
    );
  }
}

export function assertNonBlankStringOrArray(value, assertionSubject = "value") {
  if (!is.isNonBlankString(value) && !is.isNonBlankStringArray(value)) {
    throw new Error(
      `${assertionSubject} must be a non-blank string or an array of non-blank strings`,
    );
  }
}

export function assertNonBlankStringOrNonEmptyArray(
  value,
  assertionSubject = "value",
) {
  if (!is.isNonBlankString(value) && !is.isNonEmptyNonBlankStringArray(value)) {
    throw new Error(
      `${assertionSubject} must be a non-blank string or a non-empty array of non-blank strings`,
    );
  }
}

export function assertPlainObjectArray(arr, assertionSubject = "arr", ...fields) {
  if (!is.isPlainObjectArray(arr)) {
    throw new Error(`${assertionSubject} must be an array of plain objects`);
  }

  assertFieldsInPlainObjectArray(arr, ...fields);
}

export function assertNonEmptyPlainObjectArray(
  arr,
  assertionSubject = "arr",
  ...fields
) {
  if (!is.isNonEmptyPlainObjectArray(arr)) {
    throw new Error(`${assertionSubject} must be a non-empty array of plain objects`);
  }

  assertFieldsInPlainObjectArray(arr, ...fields);
}

export function assertPlainObjectOrArray(
  value,
  assertionSubject = "value",
  ...fields
) {
  if (!is.isPlainObject(value) && !is.isPlainObjectArray(value)) {
    throw new Error(
      `${assertionSubject} must be a plain object or an array of plain objects`,
    );
  }

  const objs = is.isArray(value) ? value : [value];
  assertFieldsInPlainObjectArray(objs, ...fields);
}

export function assertPlainObjectOrNonEmptyArray(
  value,
  assertionSubject = "value",
  ...fields
) {
  if (!is.isPlainObject(value) && !is.isNonEmptyPlainObjectArray(value)) {
    throw new Error(
      `${assertionSubject} must be a plain object or a non-empty array of plain objects`,
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

export function assertPlainObject(obj, assertionSubject = "obj", ...fields) {
  if (!is.isPlainObject(obj)) {
    throw new Error(`${assertionSubject} must be a plain object`);
  }

  for (const field of fields) {
    assertKeyExists(field, obj, "field");
  }
}

export function assertStringPlainObject(obj, assertionSubject = "obj") {
  assertPlainObject(obj, assertionSubject);

  for (const [key, value] of Object.entries(obj)) {
    assertString(value, `${assertionSubject}.${key}`);
  }
}

/** Function */

export function assertFunction(value, assertionSubject = "value") {
  if (!is.isFunction(value)) {
    throw new Error(`${assertionSubject} must be a function`);
  }
}

/** URL */

export function assertUrl(value, assertionSubject = "value") {
  if (!is.isValidUrl(value)) {
    throw new Error(`${assertionSubject} must be a valid URL`);
  }
}

export function assertHttpUrl(value, assertionSubject = "value") {
  if (!is.isHttpUrl(value)) {
    throw new Error(`${assertionSubject} must be an HTTP or HTTPS URL`);
  }
}

/** Key assertions */

// Key existence assertions
export function assertKeyExists(key, target, assertionSubject = "key") {
  assertNonBlankString(key, assertionSubject);

  if (!hasKey(target, key)) {
    throw new Error(`${assertionSubject} not found: ${key}`);
  }
}

// Key non-existence assertions
export function assertKeyNotExists(key, target, assertionSubject = "key") {
  assertNonBlankString(key, assertionSubject);

  if (hasKey(target, key)) {
    throw new Error(`${assertionSubject} already exists: ${key}`);
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
export function assertUint8Array(value, assertionSubject = "value") {
  if (!is.isUint8Array(value)) {
    throw new Error(`${assertionSubject} must be a Uint8Array`);
  }
}

// Base64
export function assertBase64(base64, assertionSubject = "base64") {
  if (!is.isString(base64)) {
    throw new Error(`${assertionSubject} must be a string`);
  }

  const clean = base64.replace(/^data:[^,]*;base64,/, "").replace(/\s+/g, "");

  if (clean.length % 4 === 1) {
    throw new Error(`invalid ${assertionSubject}`);
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
    throw new Error(`invalid ${assertionSubject}`);
  }

  return clean;
}

// Value existence assertions
export function assertValueExists(value, target, assertionSubject = "value") {
  if (!hasValue(target, value)) {
    throw new Error(`${assertionSubject} not found: ${value}`);
  }
}

// Value non-existence assertions
export function assertValueNotExists(value, target, assertionSubject = "value") {
  if (hasValue(target, value)) {
    throw new Error(`${assertionSubject} already exists: ${value}`);
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
export function assertValueIn(value, values, assertionSubject = "value") {
  assertArray(values, "values");

  if (!values.includes(value)) {
    throw new Error(`${assertionSubject} must be one of: ${values.join(", ")}`);
  }
}

/** Time assertions */

// Time in seconds (with up to 3 decimal places)
export function assertTimeInSeconds(seconds, assertionSubject = "seconds") {
  assertNonNegative(seconds, assertionSubject);

  const decimalLength = String(seconds).split(".")[1]?.length ?? 0;

  if (decimalLength > 3) {
    throw new Error(`${assertionSubject} must have at most 3 decimal places`);
  }
}

/** Duplicate value assertions */

export function assertNoDuplicateValues(values, assertionSubject = "values") {
  assertArray(values, assertionSubject);

  const seen = new Set(values);
  if (seen.size !== values.length) {
    throw new Error(`${assertionSubject} contains duplicate values`);
  }
}

export function assertNoDuplicatePlainObjectValues(
  objs,
  valueField,
  assertionSubject = "values",
) {
  assertPlainObjectArray(objs, assertionSubject);
  assertNonBlankString(valueField, "valueField");
  for (const item of objs) {
    assertKeyExists(valueField, item, "valueField");
  }

  const valueFieldValues = objs.map((item) => item[valueField]);

  assertNoDuplicateValues(valueFieldValues, assertionSubject);
}

// -----------------------------------------------------------------------------
// for web environment
// -----------------------------------------------------------------------------

// Assertions related to HTML elements
export function assertHtmlElement(value, assertionSubject = "value") {
  if (!is.isHtmlElement(value)) {
    throw new Error(`${assertionSubject} must be an HTML element`);
  }
}

// Assertions related to iframe and DOM element nodes
export function assertElementNode(value, assertionSubject = "value") {
  if (!is.isElementNode(value)) {
    throw new Error(`${assertionSubject} must be an element node`);
  }
}

// Assertions related to selectors and HTML elements
export function assertNonBlankStringOrHtmlElement(value, assertionSubject = "value") {
  if (!is.isNonBlankString(value) && !is.isHtmlElement(value)) {
    throw new Error(
      `${assertionSubject} must be a non-blank string or an HTML element`,
    );
  }
}

// Assertions related to selectors and element nodes
export function assertNonBlankStringOrElementNode(value, assertionSubject = "value") {
  if (!is.isNonBlankString(value) && !is.isElementNode(value)) {
    throw new Error(
      `${assertionSubject} must be a non-blank string or an element node`,
    );
  }
}

// Assertions related to element matching and containment
export function assertElementMatches(element, selector, assertionSubject = "element") {
  assertHtmlElement(element, assertionSubject);
  assertNonBlankString(selector, "selector");

  if (!element.matches(selector)) {
    throw new Error(`${assertionSubject} does not match the selector: ${selector}`);
  }
}

// Assertions related to element containment
export function assertElementContains(
  element,
  selector,
  assertionSubject = "element",
) {
  assertHtmlElement(element, assertionSubject);
  assertNonBlankString(selector, "selector");

  if (!element.querySelector(selector)) {
    throw new Error(
      `${assertionSubject} does not contain an element matching the selector: ${selector}`,
    );
  }
}