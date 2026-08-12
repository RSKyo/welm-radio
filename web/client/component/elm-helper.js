// -----------------------------------------------------------------------------
// Safe Run
// -----------------------------------------------------------------------------

export async function safeRun(handler, ...args) {
  try {
    return await handler(...args);
  } catch (error) {
    console.error(error);

    toast.error(error?.message ?? String(error));

    return undefined;
  }
}

export function safeHandler(handler) {
  return (...args) => safeRun(handler, ...args);
}

// -----------------------------------------------------------------------------
// element
// -----------------------------------------------------------------------------

export function createElementByHTML(templateString) {
  const template = document.createElement("template");
  template.innerHTML = templateString.trim();
  return template.content.firstElementChild;
}

// -----------------------------------------------------------------------------
// resolve text, value, tooltip fields
// -----------------------------------------------------------------------------

const textFieldCandidates = ["text", "label", "name", "title"];
const valueFieldCandidates = ["value", "id"];
const tooltipFieldCandidates = [
  "tooltip",
  "description",
  "text",
  "label",
  "name",
  "title",
];

export function detectFields(items) {
  return {
    textField: detectField(textFieldCandidates, items),
    valueField: detectField(valueFieldCandidates, items),
    tooltipField: detectField(tooltipFieldCandidates, items),
  };
}

function detectField(candidates, items) {
  const defaultField = candidates[0];

  if (!Array.isArray(items) || items.length === 0) {
    return defaultField;
  }

  for (const field of candidates) {
    if (Object.hasOwn(items[0], field)) {
      return field;
    }
  }

  return defaultField;
}

// -----------------------------------------------------------------------------
// validate item
// -----------------------------------------------------------------------------

export function validateItems(items, valueField) {
  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }

  for (const item of items) {
    validateItem(item, valueField);

    const value = item[valueField];

    if (values.has(value)) {
      throw new Error(`duplicate item value: ${value}`);
    }

    values.add(value);
  }
}

export function validateItem(item, valueField) {
  if (!isPlainObject(item)) {
    throw new Error("item must be a plain object");
  }

  if (!Object.hasOwn(item, valueField)) {
    throw new Error(`item is missing the ${valueField} field`);
  }

  if (!isNonBlankString(item[valueField])) {
    throw new Error(`item.${valueField} must be a non-blank string`);
  }
}

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

export function validateModeValue(value, valueMode = 1) {
  if (value == null) {
    return;
  }

  if (valueMode === 1) {
    if (!isNonBlankString(value)) {
      throw new Error("value must be a non-blank string");
    }
  } else if (valueMode === 2) {
    if (!Array.isArray(value)) {
      throw new Error("value must be an array");
    }
  } else {
    throw new Error(`invalid valueMode: ${valueMode}`);
  }
}

export function validateValue(value) {
  if (value == null) {
    return;
  }

  const isArray = Array.isArray(value);
  const values = isArray ? [...value] : [value];

  for (let i = 0; i < values.length; i++) {
    if (isArray) {
      if (!isNonBlankString(values[i])) {
        throw new Error(`value of index ${i} must be a non-blank string`);
      }
    } else {
      if (!isNonBlankString(values[i])) {
        throw new Error("value must be a non-blank string");
      }
    }
  }
}

export function validateValueExists(value, items, valueField) {
  if (value == null) {
    return;
  }

  const isArray = Array.isArray(value);
  const values = isArray ? [...value] : [value];
  const itemValues = items.map((item) => item[valueField]);

  for (let i = 0; i < values.length; i++) {
    if (isArray) {
      if (!itemValues.includes(values[i])) {
        throw new Error(`value of index ${i} not found: ${values[i]}`);
      }
    } else {
      if (!itemValues.includes(values[i])) {
        throw new Error(`value not found: ${values[i]}`);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// compare value
// -----------------------------------------------------------------------------

export function isEqualValue(value1, value2) {
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
