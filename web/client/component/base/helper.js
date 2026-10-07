export * from "../../js/helper.js";

export function filterValue(value, values) {
  if (isNullishOrEmpty(value) || isNullishOrEmpty(values)) {
    return null;
  }

  const [normalizedValues, isArray] = normalizeArray(value);

  const filteredValues = normalizedValues.filter((v) => values.includes(v));

  if (filteredValues.length === 0) {
    return null;
  }

  return isArray ? filteredValues : filteredValues[0];
}
