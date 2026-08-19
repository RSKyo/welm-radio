// -----------------------------------------------------------------------------
// element
// -----------------------------------------------------------------------------



// -----------------------------------------------------------------------------
// validate item
// -----------------------------------------------------------------------------





// -----------------------------------------------------------------------------
// filter value
// -----------------------------------------------------------------------------

export function filterValue(value, items, valueField) {
  const isArray = Array.isArray(value);
  const values = isArray ? [...value] : [value];
  const itemValues = items.map((item) => item[valueField]);

  const filteredValues = values.filter((v) => itemValues.includes(v));

  if (filteredValues.length === 0) {
    return null;
  }

  return isArray ? filteredValues : filteredValues[0];
}

// -----------------------------------------------------------------------------
// validate value
// -----------------------------------------------------------------------------







// -----------------------------------------------------------------------------
// validate type
// -----------------------------------------------------------------------------

export function isNonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}

export function isNullOrEmpty(value) {
  if (
    value == null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return true;
  }
  return false;
}

export function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}

// -----------------------------------------------------------------------------
// assert
// -----------------------------------------------------------------------------

export function assertTime(value, fieldName = "time") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  if (value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }

  const decimalLength = String(value).split(".")[1]?.length ?? 0;

  if (decimalLength > 3) {
    throw new Error(`${fieldName} must have at most 3 decimal places`);
  }

  return value;
}

export function assertNumber(value, fieldName = "value") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  return value;
}

export function assertInteger(value, fieldName = "value") {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    throw new Error(`${fieldName} must be a finite integer`);
  }

  return value;
}
