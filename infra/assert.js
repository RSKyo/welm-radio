// #region Public API 断言

export function assertRequired(value, fieldName = "value") {
  if (isNullish(value)) {
    throw new Error(`${fieldName} is required`);
  }

  return value;
}

export function assertString(value, fieldName = "value") {
  if (!isString(value)) {
    throw new Error(`${fieldName} must be a string`);
  }

  return value;
}

export function assertNonBlankString(value, fieldName = "value") {
  if (!isString(value) || isBlankString(value)) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return value;
}

export function assertNumber(value, fieldName = "value") {
  if (!isNumber(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  return value;
}

export function assertInteger(value, fieldName = "value") {
  if (!isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  return value;
}

export function assertPositive(value, fieldName = "value") {
  if (!isPositive(value)) {
    throw new Error(`${fieldName} must be a positive number`);
  }

  return value;
}

export function assertNegative(value, fieldName = "value") {
  if (!isNegative(value)) {
    throw new Error(`${fieldName} must be a negative number`);
  }

  return value;
}

export function assertBoolean(value, fieldName = "value") {
  if (!isBoolean(value)) {
    throw new Error(`${fieldName} must be a boolean`);
  }

  return value;
}

export function assertArray(value, fieldName = "value") {
  if (!isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }

  return value;
}

export function assertNonEmptyArray(value, fieldName = "value") {
  if (!isArray(value) || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }

  return value;
}

export function assertPlainObject(value, fieldName = "value") {
  if (!isPlainObject(value)) {
    throw new Error(`${fieldName} must be a plain object`);
  }

  return value;
}

export function assertEmail(value, fieldName = "value") {
  if (!isValidEmail(value)) {
    throw new Error(`${fieldName} must be a valid email address`);
  }

  return value;
}

export function assertUrl(value, fieldName = "value") {
  if (!isValidUrl(value)) {
    throw new Error(`${fieldName} must be a valid URL`);
  }

  return value;
}

export function assertHttpUrl(value, fieldName = "value") {
  if (!isHttpUrl(value)) {
    throw new Error(`${fieldName} must be an HTTP or HTTPS URL`);
  }

  return value;
}

export function assertStringOrArray(value, fieldName = "value") {
  if (isString(value) || isArray(value)) {
    return value;
  }

  throw new Error(`${fieldName} must be a string or an array`);
}

export function assertNonBlankStringOrNonEmptyArray(
  value,
  fieldName = "value",
) {
  if (isNonBlankString(value) || isNonEmptyArray(value)) {
    return value;
  }

  throw new Error(
    `${fieldName} must be a non-blank string or a non-empty array`,
  );
}

// #endregion

// #region Private Helper 原子判断

// Nullish
const isNullish = (v) => v === null || v === undefined;

// String
const isString = (v) => typeof v === "string";

const isBlankString = (v) => typeof v === "string" && v.trim() === "";

const isNonBlankString = (v) => typeof v === "string" && v.trim() !== "";

// Number
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

const isInteger = (v) => Number.isInteger(v);

const isPositive = (v) => isNumber(v) && v > 0;

const isNegative = (v) => isNumber(v) && v < 0;

// Boolean
const isBoolean = (v) => typeof v === "boolean";

// Array
const isArray = (v) => Array.isArray(v);

const isNonEmptyArray = (v) => Array.isArray(v) && v.length > 0;

// Object
const isPlainObject = (v) => {
  if (Object.prototype.toString.call(v) !== "[object Object]") {
    return false;
  }

  const proto = Object.getPrototypeOf(v);

  return proto === Object.prototype || proto === null;
};

// Email
const isValidEmail = (v) =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// URL
function parseUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const isValidUrl = (value) => parseUrl(value) !== null;

const isHttpUrl = (value) => {
  const url = parseUrl(value);

  return url?.protocol === "http:" || url?.protocol === "https:";
};

// #endregion
