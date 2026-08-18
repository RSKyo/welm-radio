import {
  createElementByHTML,
  detectFields,
  validateItems,
  validateItemFields,
  validateValue,
  validateValueExists,
  isNonBlankString,
  isNullOrEmpty,
  isPlainObject,
} from "./elm-helper.js";

// Elements are stored by reference.
// The element in the Map and the element in the DOM are the same object.
export class ElmRoot {
  #rootElement;
  #childMap = new Map();

  constructor(element) {
    this.#assertElement(element);
    this.#rootElement = element;
  }

  get element() {
    return this.#rootElement;
  }

  get size() {
    return this.#childMap.size;
  }

  clear() {
    while (this.size > 0) {
      const keys = this.keys();

      this.remove(keys.at(-1));
    }
  }

  add(key, element, parentKey = null) {
    this.#assertNotExistingKey(key);
    this.#assertElement(element);

    if (parentKey != null) {
      this.#assertExistingKey(parentKey);

      const parent = this.#childMap.get(parentKey);
      parent.element.appendChild(element);

      // Update the parent's childKeys to include the new child.
      parent.childKeys.push(key);
      this.#childMap.set(parentKey, parent);
    } else {
      this.#rootElement.appendChild(element);
    }

    // add the new element to the child map
    this.#childMap.set(key, {
      element,
      parentKey,
      childKeys: [],
    });
  }

  get(key) {
    // Returns undefined if the key does not exist.
    return this.#childMap.get(key)?.element;
  }

  remove(key) {
    this.#assertExistingKey(key);

    for (const childKey of this.childKeys(key)) {
      this.remove(childKey);
    }

    const { parentKey } = this.#childMap.get(key);
    if (parentKey != null) {
      const parent = this.#childMap.get(parentKey);
      parent.childKeys = parent.childKeys.filter((k) => k !== key);
      this.#childMap.set(parentKey, parent);
    }

    const { element } = this.#childMap.get(key);

    element.remove();
    this.#childMap.delete(key);
  }

  replace(key, element) {
    this.#assertExistingKey(key);
    this.#assertElement(element);

    const current = this.#childMap.get(key);
    current.element.replaceWith(element);

    if (current.childKeys.length > 0) {
      for (const childKey of current.childKeys) {
        const child = this.#childMap.get(childKey);
        element.appendChild(child.element);
      }
    }

    this.#childMap.set(key, {
      ...current,
      element,
    });
  }

  keys() {
    return [...this.#childMap.keys()];
  }

  childKeys(key) {
    this.#assertExistingKey(key);

    return [...this.#childMap.get(key).childKeys];
  }

  elements() {
    return Array.from(this.#childMap.values(), (item) => item.element);
  }

  children(key) {
    this.#assertExistingKey(key);

    return this.childKeys(key).map((childKey) => this.get(childKey));
  }

  has(key) {
    this.#assertKey(key);

    return this.#childMap.has(key);
  }

  each(callback) {
    if (typeof callback !== "function") {
      throw new Error("callback must be a function");
    }

    for (const [key, item] of this.#childMap.entries()) {
      callback(key, item.element, item.parentKey);
    }
  }

  #assertKey(key) {
    if (typeof key !== "string" || key.trim() === "") {
      throw new Error("key must be a non-blank string");
    }
  }

  #assertExistingKey(key) {
    this.#assertKey(key);

    if (!this.#childMap.has(key)) {
      throw new Error(`element not found: ${key}`);
    }
  }

  #assertNotExistingKey(key) {
    this.#assertKey(key);

    if (this.#childMap.has(key)) {
      throw new Error(`element already exists: ${key}`);
    }
  }

  #assertElement(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error("element must be an HTMLElement");
    }
  }
}
