import {
  assertPlainObjectArray,
  assertKeyExists,
  assertKeyNotExists,
  assertHtmlElement,
  assertFunction,
  assertNonBlankString,
} from "welm-cdp/infra/assert";

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
      this.#rootElement.removeEventListener(event.type, event.wrapper);
    }

    this.#rootElement = null;
    this.#rootEvents = [];
  }

  add(key, newElement, parentKey = null) {
    assertKeyNotExists(key, this.#elementMap);
    assertHtmlElement(newElement, "newElement");

    if (newElement === this.#rootElement) {
      throw new Error("newElement cannot be the root element");
    }

    for (const [key, item] of this.#elementMap) {
      if (item.element === newElement) {
        throw new Error(`newElement already exists: ${key}`);
      }
    }

    if (parentKey !== null) {
      assertKeyExists(parentKey, this.#elementMap, "parentKey");
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

  replace(key, newElement) {
    assertKeyExists(key, this.#elementMap, "key");
    assertHtmlElement(newElement, "newElement");

    if (newElement === this.#rootElement) {
      throw new Error("newElement cannot be the root element");
    }

    for (const [key, item] of this.#elementMap) {
      if (item.element === newElement) {
        throw new Error(`newElement already exists: ${key}`);
      }
    }

    const current = this.#elementMap.get(key);
    const oldElement = current.element;

    for (const childKey of current.childKeys) {
      const child = this.#elementMap.get(childKey);
      newElement.appendChild(child.element);
    }

    for (const event of current.events) {
      oldElement.removeEventListener(event.type, event.wrapper);
      newElement.addEventListener(event.type, event.wrapper);
    }

    oldElement.replaceWith(newElement);
    current.element = newElement;
  }

  remove(key) {
    assertKeyExists(key, this.#elementMap, "key");

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
      current.element.removeEventListener(event.type, event.wrapper);
    }

    current.element.remove();
    this.#elementMap.delete(key);
  }

  get(key) {
    // Returns undefined if the key does not exist.
    return this.#elementMap.get(key)?.element;
  }

  keys() {
    return [...this.#elementMap.keys()];
  }

  childKeys(key) {
    assertKeyExists(key, this.#elementMap, "key");

    return [...this.#elementMap.get(key).childKeys];
  }

  elements() {
    return Array.from(this.#elementMap.values(), (item) => item.element);
  }

  children(key) {
    assertKeyExists(key, this.#elementMap, "key");

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
    assertKeyExists(key, this.#elementMap, "key");
    const { element, events } = this.#elementMap.get(key);

    this.#registerEvent(element, type, handler, events);
  }

  off(key, type, handler) {
    assertKeyExists(key, this.#elementMap, "key");
    const { element, events } = this.#elementMap.get(key);

    this.#unregisterEvent(element, type, handler, events);
  }

  onRoot(type, handler) {
    this.#registerEvent(this.#rootElement, type, handler, this.#rootEvents);
  }

  offRoot(type, handler) {
    this.#unregisterEvent(this.#rootElement, type, handler, this.#rootEvents);
  }

  #registerEvent(element, eventType, handler, eventRegistry) {
    if (element == null) {
      return;
    }

    assertHtmlElement(element, "element");
    assertNonBlankString(eventType, "eventType");
    assertFunction(handler, "handler");
    assertPlainObjectArray(eventRegistry, "eventRegistry");

    const index = eventRegistry.findIndex(
      (event) => event.eventType === eventType && event.handler === handler,
    );

    if (index !== -1) {
      return;
    }

    const wrapper = (event) => {
      const targetClosest = (selector, closestHandler, notFoundHandler) => {
        assertNonBlankString(selector, "selector");
        if (closestHandler != null) {
          assertFunction(closestHandler, "closestHandler");
        }
        if (notFoundHandler != null) {
          assertFunction(notFoundHandler, "notFoundHandler");
        }

        const { target, currentTarget } = event;

        if (
          !(target instanceof Element) ||
          !(currentTarget instanceof Element)
        ) {
          return null;
        }

        const element = target.closest(selector);

        if (element == null || !currentTarget.contains(element)) {
          notFoundHandler?.({ event });
          return null;
        }

        closestHandler?.({ event, target: element });
        return element;
      };
      handler(event, { targetClosest });
    };

    element.addEventListener(eventType, wrapper);

    eventRegistry.push({
      eventType,
      wrapper,
      handler,
    });
  }

  #unregisterEvent(element, eventType, handler, eventRegistry) {
    if (element == null) {
      return;
    }

    assertHtmlElement(element, "element");
    assertNonBlankString(eventType, "eventType");
    assertFunction(handler, "handler");
    assertPlainObjectArray(eventRegistry, "eventRegistry");

    const index = eventRegistry.findIndex(
      (event) => event.eventType === eventType && event.handler === handler,
    );

    if (index === -1) {
      return;
    }

    const { wrapper } = eventRegistry[index];

    element.removeEventListener(eventType, wrapper);

    eventRegistry.splice(index, 1);
  }
}
