// -------------------------------
// 原子判断（全部正向）
// -------------------------------

// existence
export const isNull = (v) => v === null || v === undefined;

// type
export const isString = (v) => typeof v === "string";

export const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

export const isBoolean = (v) => typeof v === "boolean";

export const isArray = (v) => Array.isArray(v);

export const isObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export const isFunction = (v) => typeof v === "function";

// string
export const isBlank = (v) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

export const isTooShort = (v, min) => typeof v === "string" && v.length < min;

export const isTooLong = (v, max) => typeof v === "string" && v.length > max;

export const isPatternMatched = (v, regex) =>
  typeof v === "string" && regex.test(v);

export const isInteger = (v) => Number.isInteger(Number(v));

export const isPositive = (v) => Number.isFinite(Number(v)) && Number(v) > 0;

export const isNegative = (v) => Number.isFinite(Number(v)) && Number(v) < 0;

export const isInRange = (v, { min, max } = {}) => {
  const n = Number(v);

  return (
    Number.isFinite(n) && (min == null || n >= min) && (max == null || n <= max)
  );
};

// collection
export const isInEnum = (v, values) =>
  Array.isArray(values) && values.includes(v);

export const isUnique = (arr) =>
  Array.isArray(arr) && new Set(arr).size === arr.length;

// format
export const isValidEmail = (v) =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const isValidUrl = (v) => {
  if (typeof v !== "string") return false;

  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
};

export const isHttpUrl = (v) => {
  if (!isValidUrl(v)) {
    return false;
  }

  const url = new URL(v);

  return url.protocol === "http:" || url.protocol === "https:";
};

export const isValidDate = (v) =>
  v !== "" &&
  v !== null &&
  v !== undefined &&
  !Number.isNaN(new Date(v).getTime());

export const isPlainObject = (value) => {
  return Object.prototype.toString.call(value) === "[object Object]";
};

// -------------------------------
// 断言
// -------------------------------

export function assertRequired(value, fieldName = "value") {
  if (isNull(value)) {
    throw new Error(`${fieldName} is required`);
  }

  return value;
}

export function assertPositive(value, fieldName = "value") {
  if (!isPositive(value)) {
    throw new Error(`${fieldName} must be a positive number`);
  }

  return value;
}

export function assertString(value, fieldName = "value") {
  if (!isString(value)) {
    throw new Error(`${fieldName} must be a string`); 
  }

  return value;
}

export function assertNonBlank(value, fieldName = "value") {
  if (isBlank(value)) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return value;
}

export function assertHttpUrl(value, fieldName = "url") {
  if (!isHttpUrl(value)) {
    throw new Error(`${fieldName} must be a valid http or https url`);
  }

  return value;
}

export function assertNonEmptyArray(value, fieldName = "value") {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }

  return value;
}

export function assertStringOrNonEmptyArray(value, fieldName = "value") {
  if (typeof value === "string" || (Array.isArray(value) && value.length > 0)) {
    return value;
  }

  throw new Error(`${fieldName} must be a string or a non-empty array`);
}
