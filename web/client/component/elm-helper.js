// -----------------------------------------------------------------------------
// element
// -----------------------------------------------------------------------------

export function createElementByHTML(html, fieldName = "html") {
  if (!isNonBlankString(html)) {
    throw new Error(`${fieldName} must be a non-blank HTML string`);
  }

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const { children } = template.content;

  if (children.length !== 1) {
    throw new Error(`${fieldName} must contain exactly one root element`);
  }

  const element = children[0];

  if (!(element instanceof HTMLElement)) {
    throw new Error(`${fieldName} must create an HTMLElement`);
  }

  return element;
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

export function validateItems(items) {
  if (items == null) {
    return;
  }

  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }

  for (const item of items) {
    if (!isPlainObject(item)) {
      throw new Error("item must be a plain object");
    }
  }
}

export function validateItemFields(input, textField, valueField) {
  if (input == null) {
    return;
  }

  const items = Array.isArray(input) ? input : [input];

  for (const item of items) {
    if (!isPlainObject(item)) {
      throw new Error("item must be a plain object");
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
  }

  const values = new Set(items.map((item) => item[valueField]));
  if (values.size !== items.length) {
    throw new Error("items must not contain duplicate values");
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
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("value must be a non-empty array");
    }
    if (value.length !== new Set(value).size) {
      throw new Error("value must not contain duplicates");
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

export function dispatchEvent(selector, event, handler) {
  const target = event.target.closest(selector);
  if (!target || !event.currentTarget.contains(target)) {
    return;
  }

  handler({ event, target });
}

export function dispatchItemEvent(selector, event, handler) {
  const target = event.target.closest(selector);
  if (!target || !event.currentTarget.contains(target)) {
    return;
  }

  const itemElement = target.closest('[data-role="item"]');
  if (!itemElement || !event.currentTarget.contains(itemElement)) {
    return;
  }

  handler({
    event,
    target,
    itemElement,
    value: itemElement.dataset.value,
  });
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
