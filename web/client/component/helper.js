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
// init root element
// -----------------------------------------------------------------------------

export function initRootElement(root, rootClass) {
  if (root == null) {
    throw new Error("root must be provided");
  }

  if (
    rootClass != null &&
    (!isNonBlankString(rootClass) || /\s/.test(rootClass))
  ) {
    throw new Error("rootClass must be a single non-blank CSS class name");
  }

  let el;

  if (isNonBlankString(root)) {
    const selector = root.startsWith("#") ? root : `#${root}`;

    el = document.querySelector(selector);

    if (!el) {
      throw new Error(`element not found: ${selector}`);
    }
  } else if (root instanceof HTMLElement) {
    el = root;
  } else {
    throw new Error("root must be a non-blank string or an HTMLElement");
  }

  if (rootClass) {
    el.classList.add(rootClass);
  }

  return el;
}

// -----------------------------------------------------------------------------
// resolve field
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

  const values = new Set();

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

// export function validateValues(values, items, valueField) {
//   if (values == null) {
//     return;
//   }

//   if (!Array.isArray(values) || values.length === 0) {
//     throw new Error("values must be a non-empty array");
//   }

//   const itemValues = items.map((item) => item[valueField]);

//   for (const v of values) {
//     if (!isNonBlankString(v)) {
//       throw new Error("value array must contain only non-blank strings");
//     }

//     if (!itemValues.includes(v)) {
//       throw new Error(`value not found: ${v}`);
//     }
//   }
// }

// export function validateValue(value, items, valueField) {
//   if (value == null) {
//     return;
//   }

//   if (!isNonBlankString(value)) {
//     throw new Error("value must be a non-blank string");
//   }

//   if (!items.some((item) => item[valueField] === value)) {
//     throw new Error(`value not found: ${value}`);
//   }
// }

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
