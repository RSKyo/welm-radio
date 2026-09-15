import {
  isNullish,
  isHtmlElement,
  assertNonBlankStringOrHtmlElement,
  assertHtmlElement,
  assertNonBlankString,
  assertPlainObject,
  assertElementMatches,
  assertElementContains,
  assertNonEmptyNonBlankStringArray,
} from "./assert.js";

export function createElementByHTML(html, assertionSubject = "html") {
  assertNonBlankString(html, assertionSubject);

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const elements = Array.from(template.content.children);

  if (elements.length === 0) {
    throw new Error(
      `${assertionSubject} must contain at least one root element`,
    );
  }

  for (const element of elements) {
    assertHtmlElement(element, assertionSubject);
  }

  return elements.length === 1 ? elements[0] : elements;
}

export function resolveElement(
  target,
  assertionSubject = "target",
  options = {},
) {
  assertNonBlankStringOrHtmlElement(target, assertionSubject);
  assertPlainObject(options, "options");

  let element;
  if (isHtmlElement(target)) {
    element = target;
  } else {
    target = target.trim();

    if (target.startsWith("<") && target.endsWith(">")) {
      element = createElementByHTML(target, assertionSubject);
      if (Array.isArray(element)) {
        throw new Error(
          `${assertionSubject} must contain exactly one root element`,
        );
      }
    } else if (target.startsWith("#")) {
      element = document.getElementById(target.slice(1));
    } else {
      try {
        element = document.querySelector(target);
      } catch {
        throw new Error(
          `${assertionSubject} must be a valid CSS selector: ${target}`,
        );
      }
    }
  }

  assertHtmlElement(element, assertionSubject);

  const [matches] = normalizeArray(options.matches);
  const [contains] = normalizeArray(options.contains);

  for (const selector of matches) {
    assertNonBlankString(selector, "matches selector");
    assertElementMatches(element, selector, assertionSubject);
  }

  for (const selector of contains) {
    assertNonBlankString(selector, "contains selector");
    assertElementContains(element, selector, assertionSubject);
  }

  return element;
}

export function getBySelector(element, ...selectors) {
  assertHtmlElement(element, "element");
  assertNonEmptyNonBlankStringArray(selectors, "selectors");

  const elements = selectors.map((selector) => {
    let el;

    try {
      el = element.querySelector(selector);
    } catch {
      throw new Error(`selector must be a valid CSS selector: ${selector}`);
    }

    assertHtmlElement(el, `element matching selector "${selector}"`);

    return el;
  });

  return selectors.length === 1 ? elements[0] : elements;
}

export function normalizeArray(value) {
  if (isNullish(value)) {
    return [[], false];
  }
  return Array.isArray(value) ? [value, true] : [[value], false];
}

export function isEqualValue(value1, value2) {
  if (Object.is(value1, value2)) {
    return true;
  }

  if (value1 == null || value2 == null) {
    return false;
  }

  if (value1 instanceof Date || value2 instanceof Date) {
    return (
      value1 instanceof Date &&
      value2 instanceof Date &&
      value1.getTime() === value2.getTime()
    );
  }

  if (Array.isArray(value1) || Array.isArray(value2)) {
    if (!Array.isArray(value1) || !Array.isArray(value2)) {
      return false;
    }

    if (value1.length !== value2.length) {
      return false;
    }

    const matchedIndexes = new Set();

    return value1.every((item1) => {
      const index = value2.findIndex(
        (item2, index) =>
          !matchedIndexes.has(index) && isEqualValue(item1, item2),
      );

      if (index === -1) {
        return false;
      }

      matchedIndexes.add(index);

      return true;
    });
  }

  if (typeof value1 === "object" && typeof value2 === "object") {
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    return keys1.every(
      (key) =>
        Object.hasOwn(value2, key) && isEqualValue(value1[key], value2[key]),
    );
  }

  return false;
}
