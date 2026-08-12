export class Elm {
  #rootElement;
  #root;

  constructor(root, rootClass, data = {}) {
    this.#rootElement = this.#initRootElement(root, rootClass, data);
    this.#root = new ElmRoot(this.#rootElement);
  }

  get rootElement() {
    return this.#rootElement;
  }

  get root() {
    return this.#root;
  }

  get dataset() {
    return this.#rootElement.dataset;
  }

  #initRootElement(target, className, data = {}) {
    if (
      className != null &&
      (!this.#isNonBlankString(className) || /\s/.test(className))
    ) {
      throw new Error("className must be a single non-blank CSS class name");
    }

    let element = target;

    if (this.#isNonBlankString(target)) {
      element = document.getElementById(target);
    }

    if (!element || !(element instanceof HTMLElement)) {
      throw new Error("target must be an element id or an HTMLElement");
    }

    if (className) {
      element.classList.add(className);
    }

    for (const [key, value] of Object.entries(data)) {
      element.dataset[key] = value;
    }

    return element;
  }

  #isNonBlankString(value) {
    return typeof value === "string" && value.trim() !== "";
  }
}

// Elements are stored by reference.
// The element in the Map and the element in the DOM are the same object.
export class ElmRoot {
  #element;
  #childMap = new Map();

  constructor(element) {
    this.#assertElement(element);
    this.#element = element;
  }

  get element() {
    return this.#element;
  }

  clear() {
    for (const element of this.#childMap.values()) {
      // Remove the element from the DOM.
      element.remove();
    }

    this.#childMap.clear();
  }

  add(key, element) {
    this.#assertKey(key);
    this.#assertElement(element);

    if (this.#childMap.has(key)) {
      throw new Error(`element already exists: ${key}`);
    }

    this.#element.appendChild(element);
    this.#childMap.set(key, element);
  }

  get(key) {
    // Returns undefined if the key does not exist.
    return this.#childMap.get(key);
  }

  remove(key) {
    this.#assertExistingKey(key);
    const element = this.#childMap.get(key);

    element.remove();
    this.#childMap.delete(key);

    return element;
  }

  replace(key, element) {
    this.#assertElement(element);
    this.#assertExistingKey(key);

    const oldElement = this.#childMap.get(key);

    oldElement.replaceWith(element);
    this.#childMap.set(key, element);

    return oldElement;
  }

  keys() {
    return [...this.#childMap.keys()];
  }

  elements() {
    return [...this.#childMap.values()];
  }

  has(key) {
    this.#assertKey(key);

    return this.#childMap.has(key);
  }

  get size() {
    return this.#childMap.size;
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

  #assertElement(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error("element must be an HTMLElement");
    }
  }
}
