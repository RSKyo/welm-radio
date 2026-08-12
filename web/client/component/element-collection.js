// Elements are stored by reference.
// The element in the Map and the element in the DOM are the same object.
export class ElementCollection {
  #root;
  #elements = new Map();

  constructor(root) {
    this.#assertElement(root);

    this.#root = root;
  }

  clear() {
    this.#root.replaceChildren();
    this.#elements.clear();
  }

  add(key, element) {
    this.#assertKey(key);
    this.#assertElement(element);

    if (this.#elements.has(key)) {
      throw new Error(`element already exists: ${key}`);
    }

    this.#root.appendChild(element);
    this.#elements.set(key, element);
  }

  get(key) {
    // Returns undefined if the key does not exist.
    return this.#elements.get(key);
  }

  remove(key) {
    this.#assertExistingKey(key);
    const element = this.#elements.get(key);

    element.remove();
    this.#elements.delete(key);

    return element;
  }

  replace(key, element) {
    this.#assertExistingKey(key);
    this.#assertElement(element);

    const oldElement = this.#elements.get(key);

    oldElement.replaceWith(element);
    this.#elements.set(key, element);

    return oldElement;
  }

  keys() {
    return [...this.#elements.keys()];
  }

  values() {
    return [...this.#elements.values()];
  }

  has(key) {
    this.#assertKey(key);

    return this.#elements.has(key);
  }

  #assertKey(key) {
    if (typeof key !== "string" || key.trim() === "") {
      throw new Error("key must be a non-blank string");
    }
  }

  #assertExistingKey(key) {
    this.#assertKey(key);

    if (!this.#elements.has(key)) {
      throw new Error(`element not found: ${key}`);
    }
  }

  #assertElement(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error("element must be an HTMLElement");
    }
  }
}
