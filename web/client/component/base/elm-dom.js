// Elements are stored by reference.
// The element in the Map and the element in the DOM are the same object.
export class ElmDom {
  #root;
  #elementMap = new Map();

  constructor(element) {
    this.#assertElement(element);
    this.#root = element;
  }

  get root() {
    return this.#root;
  }

  get size() {
    return this.#elementMap.size;
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

      const parent = this.#elementMap.get(parentKey);
      parent.element.appendChild(element);

      // Update the parent's childKeys to include the new child.
      parent.childKeys.push(key);
      this.#elementMap.set(parentKey, parent);
    } else {
      this.#root.appendChild(element);
    }

    // add the new element to the child map
    this.#elementMap.set(key, {
      element,
      parentKey,
      childKeys: [],
    });
  }

  get(key) {
    // Returns undefined if the key does not exist.
    return this.#elementMap.get(key)?.element;
  }

  remove(key) {
    this.#assertExistingKey(key);

    for (const childKey of this.childKeys(key)) {
      this.remove(childKey);
    }

    const { parentKey } = this.#elementMap.get(key);
    if (parentKey != null) {
      const parent = this.#elementMap.get(parentKey);
      parent.childKeys = parent.childKeys.filter((k) => k !== key);
      this.#elementMap.set(parentKey, parent);
    }

    const { element } = this.#elementMap.get(key);

    element.remove();
    this.#elementMap.delete(key);
  }

  replace(key, element) {
    this.#assertExistingKey(key);
    this.#assertElement(element);

    const current = this.#elementMap.get(key);
    current.element.replaceWith(element);

    if (current.childKeys.length > 0) {
      for (const childKey of current.childKeys) {
        const child = this.#elementMap.get(childKey);
        element.appendChild(child.element);
      }
    }

    this.#elementMap.set(key, {
      ...current,
      element,
    });
  }

  keys() {
    return [...this.#elementMap.keys()];
  }

  childKeys(key) {
    this.#assertExistingKey(key);

    return [...this.#elementMap.get(key).childKeys];
  }

  elements() {
    return Array.from(this.#elementMap.values(), (item) => item.element);
  }

  children(key) {
    this.#assertExistingKey(key);

    return this.childKeys(key).map((childKey) => this.get(childKey));
  }

  has(key) {
    this.#assertKey(key);

    return this.#elementMap.has(key);
  }

  each(callback) {
    if (typeof callback !== "function") {
      throw new Error("callback must be a function");
    }

    for (const [key, item] of this.#elementMap.entries()) {
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

    if (!this.#elementMap.has(key)) {
      throw new Error(`element not found: ${key}`);
    }
  }

  #assertNotExistingKey(key) {
    this.#assertKey(key);

    if (this.#elementMap.has(key)) {
      throw new Error(`element already exists: ${key}`);
    }
  }

  #assertElement(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error("element must be an HTMLElement");
    }
  }
}
