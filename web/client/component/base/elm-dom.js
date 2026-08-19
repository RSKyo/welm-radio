// Elements are stored by reference.
// The element in the Map and the element in the DOM are the same object.
export class ElmDom {
  #rootElement;
  #rootEvents = [];
  #elementMap = new Map();

  constructor(rootElement) {
    assertHtmlElement(rootElement, "root element");
    this.#rootElement = rootElement;
  }

  get rootElement() {
    return this.#rootElement;
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

  destroy() {
    this.clear();

    for (const event of this.#rootEvents) {
      this.#rootElement.removeEventListener(event.type, event.handler);
    }

    this.#rootElement = null;
    this.#rootEvents = [];
  }

  add(key, newElement, parentKey = null) {
    assertKeyNotExists(key, this.#elementMap);
    assertElementNotExists(newElement, this.#elementMap, "newElement");
    if (newElement === this.#rootElement) {
      throw new Error("newElement cannot be the root element");
    }

    if (parentKey !== null) {
      assertKeyExists(parentKey, this.#elementMap);
      const parent = this.#elementMap.get(parentKey);
      parent.element.appendChild(newElement);
      parent.childKeys.push(key);
    } else {
      this.#rootElement.appendChild(newElement);
    }

    this.#elementMap.set(key, {
      element: newElement,
      parentKey,
      childKeys: [],
      events: [],
    });
  }

  get(key) {
    // Returns undefined if the key does not exist.
    return this.#elementMap.get(key)?.element;
  }

  remove(key) {
    assertKeyExists(key, this.#elementMap);

    // Remove all child elements recursively.
    for (const childKey of this.childKeys(key)) {
      this.remove(childKey);
    }

    const current = this.#elementMap.get(key);

    // update the parent's childKeys to remove the child being removed
    if (current.parentKey != null) {
      const parent = this.#elementMap.get(current.parentKey);
      parent.childKeys = parent.childKeys.filter((k) => k !== key);
    }

    // Remove all event listeners from the element.
    for (const event of current.events) {
      current.element.removeEventListener(event.type, event.handler);
    }

    current.element.remove();
    this.#elementMap.delete(key);
  }

  replace(key, newElement) {
    assertKeyExists(key, this.#elementMap);
    assertElementNotExists(newElement, this.#elementMap, "newElement");
    if (newElement === this.#rootElement) {
      throw new Error("newElement cannot be the root element");
    }

    const current = this.#elementMap.get(key);
    const oldElement = current.element;

    for (const childKey of current.childKeys) {
      const child = this.#elementMap.get(childKey);
      newElement.appendChild(child.element);
    }

    for (const event of current.events) {
      oldElement.removeEventListener(event.type, event.handler);
      newElement.addEventListener(event.type, event.handler);
    }

    oldElement.replaceWith(newElement);
    current.element = newElement;
  }

  keys() {
    return [...this.#elementMap.keys()];
  }

  childKeys(key) {
    assertKeyExists(key, this.#elementMap);

    return [...this.#elementMap.get(key).childKeys];
  }

  elements() {
    return Array.from(this.#elementMap.values(), (item) => item.element);
  }

  children(key) {
    assertKeyExists(key, this.#elementMap);

    return this.childKeys(key).map((childKey) => this.get(childKey));
  }

  has(key) {
    assertNonBlankString(key, "key");

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

  on(key, type, handler) {
    assertKeyExists(key, this.#elementMap);
    assertNonBlankString(type, "type");
    assertFunction(handler, "handler");

    const item = this.#elementMap.get(key);

    const index = item.events.findIndex(
      (event) => event.type === type && event.handler === handler,
    );

    if (index === -1) {
      item.element.addEventListener(type, handler);
      item.events.push({
        type,
        handler,
      });
    }
  }

  off(key, type, handler) {
    assertKeyExists(key, this.#elementMap);
    assertNonBlankString(type, "type");
    assertFunction(handler, "handler");

    const item = this.#elementMap.get(key);

    const index = item.events.findIndex(
      (event) => event.type === type && event.handler === handler,
    );

    if (index === -1) {
      return;
    }

    const event = item.events[index];

    item.element.removeEventListener(event.type, event.handler);

    item.events.splice(index, 1);
  }

  onRoot(type, handler) {
    if (this.#rootElement == null) {
      return;
    }

    assertNonBlankString(type, "type");
    assertFunction(handler, "handler");

    const index = this.#rootEvents.findIndex(
      (event) => event.type === type && event.handler === handler,
    );

    if (index === -1) {
      this.#rootElement.addEventListener(type, handler);
      this.#rootEvents.push({
        type,
        handler,
      });
    }
  }

  offRoot(type, handler) {
    if (this.#rootElement == null) {
      return;
    }

    assertNonBlankString(type, "type");
    assertFunction(handler, "handler");

    const index = this.#rootEvents.findIndex(
      (event) => event.type === type && event.handler === handler,
    );

    if (index === -1) {
      return;
    }

    const event = this.#rootEvents[index];

    this.#rootElement.removeEventListener(event.type, event.handler);

    this.#rootEvents.splice(index, 1);
  }
}

function assertHtmlElement(element, fieldName = "element") {
  if (!(element instanceof HTMLElement)) {
    throw new Error(`${fieldName} must be an HTMLElement`);
  }
}

function assertKeyExists(key, elementMap) {
  assertNonBlankString(key, "key");

  if (!elementMap.has(key)) {
    throw new Error(`element not found: ${key}`);
  }
}

function assertKeyNotExists(key, elementMap) {
  assertNonBlankString(key, "key");

  if (elementMap.has(key)) {
    throw new Error(`element already exists: ${key}`);
  }
}

function assertElementNotExists(element, elementMap, fieldName = "element") {
  assertHtmlElement(element, fieldName);

  for (const [key, item] of elementMap.entries()) {
    if (item.element === element) {
      throw new Error(`${fieldName} already exists: ${key}`);
    }
  }
}

function assertFunction(value, fieldName = "value") {
  if (typeof value !== "function") {
    throw new Error(`${fieldName} must be a function`);
  }
}

function assertNonBlankString(value, fieldName = "value") {
  if (!isNonBlankString(value)) {
    throw new Error(`${fieldName} must be a non-blank string`);
  }
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}
