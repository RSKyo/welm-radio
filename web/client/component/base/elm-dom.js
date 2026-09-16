import {
  assertKeyExists,
  assertKeyNotExists,
  assertHtmlElement,
  isNonBlankString,
  isHtmlElement,
} from "./assert.js";
import { EventRegistry } from "./elm-event.js";
import { getBySelector } from "./elm-helper.js";

// Elements are stored by reference.
// The element in the Map and the element in the DOM are the same object.
export class ElmDom {
  #rootElement;
  #elementMap = new Map();
  #eventRegistry = new EventRegistry();

  constructor(rootElement) {
    assertHtmlElement(rootElement, "rootElement");
    this.#rootElement = rootElement;
  }

  get rootElement() {
    return this.#rootElement;
  }

  get size() {
    return this.#elementMap.size;
  }

  get keys() {
    return Array.from(this.#elementMap.keys());
  }

  get elements() {
    return Array.from(this.#elementMap.values());
  }

  getChildKeys(key) {
    assertKeyExists(key, this.#elementMap, "key");
    const element = this.#get(key);

    return Array.from(this.#elementMap.entries())
      .filter(([, childElement]) => childElement.parentElement === element)
      .map(([childKey]) => childKey);
  }

  getChildren(key) {
    assertKeyExists(key, this.#elementMap, "key");
    const element = this.#get(key);

    return Array.from(this.#elementMap.values()).filter(
      (childElement) => childElement.parentElement === element,
    );
  }

  has(target) {
    if (isNonBlankString(target)) {
      return this.#elementMap.has(target);
    }

    if (isHtmlElement(target)) {
      return this.elements.includes(target);
    }

    throw new Error(
      `target must be a non-blank string or an HTML element: ${target}`,
    );
  }

  get(key, ...selectors) {
    assertKeyExists(key, this.#elementMap, "key");

    const element = this.#get(key);

    if (selectors.length === 0) {
      return element;
    }

    return getBySelector(element, ...selectors);
  }

  #get(key) {
    return this.#elementMap.get(key);
  }

  add(key, newElement, target = null) {
    assertKeyNotExists(key, this.#elementMap);
    assertHtmlElement(newElement, "newElement");
    this.#assertElementIsNotRoot(newElement, "newElement");
    this.#assertElementNotExists(newElement, "newElement");

    const { element: targetElement } = this.#resolveTarget(target);
    targetElement.appendChild(newElement);
    this.#elementMap.set(key, newElement);
  }

  replace(target, newElement) {
    assertHtmlElement(newElement, "newElement");
    this.#assertElementIsNotRoot(newElement, "newElement");
    this.#assertElementNotExists(newElement, "newElement");

    const { key,element: oldElement } = this.#resolveTarget(target);
    this.#assertElementIsNotRoot(oldElement, "oldElement");

    while (oldElement.firstChild) {
      newElement.appendChild(oldElement.firstChild);
    }

    this.#eventRegistry.replace(oldElement, newElement);

    oldElement.replaceWith(newElement);

    for (const [key, element] of this.#elementMap.entries()) {
      if (element === oldElement) {
        this.#elementMap.set(key, newElement);
        break;
      }
    }
  }

  remove(key) {
    assertKeyExists(key, this.#elementMap, "key");

    // Remove all child elements recursively.
    for (const childKey of this.getChildKeys(key)) {
      this.remove(childKey);
    }

    const element = this.#get(key);

    this.#eventRegistry.off({ element });
    element.remove();
    this.#elementMap.delete(key);
  }

  clear(key) {
    if (key == null) {
      while (this.size > 0) {
        const keys = this.keys;
        this.remove(keys.at(-1));
      }
      return;
    }

    assertKeyExists(key, this.#elementMap, "key");

    // Remove all descendants while preserving the element itself.
    for (const childKey of this.getChildKeys(key)) {
      this.remove(childKey);
    }
  }

  #resolveTarget(target) {
    if (isNonBlankString(target)) {
      assertKeyExists(target, this.#elementMap, "target");

      return {
        key: target,
        element: this.#get(target),
      };
    }

    if (isHtmlElement(target)) {
      if (!this.#rootElement.contains(target)) {
        throw new Error(
          `target element must be within the root element: ${target}`,
        );
      }

      for (const [key, element] of this.#elementMap.entries()) {
        if (element === target) {
          return { key, element };
        }
      }

      return {
        key: null,
        element: target,
      };
    }

    throw new Error(
      `target must be a non-blank string or an HTML element: ${target}`,
    );
  }

  on(
    key,
    type,
    handler,
    {
      detail = null,
      listenerSelector = null,
      selector = null,
      unmatchedHandler = null,
    } = {},
  ) {
    assertKeyExists(key, this.#elementMap, "key");
    const element = this.#get(key);
    const listenerElement =
      listenerSelector == null
        ? element
        : getBySelector(element, listenerSelector);

    this.#eventRegistry.on(listenerElement, type, handler, {
      detail,
      selector,
      unmatchedHandler,
    });
  }

  off(key, { type = null, handler = null, subtree = false } = {}) {
    assertKeyExists(key, this.#elementMap, "key");
    const element = this.#get(key);

    this.#eventRegistry.off({ element, type, handler, subtree });
  }

  onRoot(
    type,
    handler,
    { detail = null, selector = null, unmatchedHandler = null } = {},
  ) {
    this.#eventRegistry.on(this.#rootElement, type, handler, {
      detail,
      selector,
      unmatchedHandler,
    });
  }

  offRoot({ type = null, handler = null, subtree = false } = {}) {
    this.#eventRegistry.off({
      element: this.#rootElement,
      type,
      handler,
      subtree,
    });
  }

  destroy() {
    this.clear();
    this.#eventRegistry.off();
    this.#rootElement = null;
  }

  #assertElementIsNotRoot(element, assertionSubject = "element") {
    if (element === this.#rootElement) {
      throw new Error(`${assertionSubject} cannot be the root element`);
    }
  }

  #assertElementNotExists(element, assertionSubject = "element") {
    for (const [key, el] of this.#elementMap) {
      if (el === element) {
        throw new Error(`${assertionSubject} already exists: ${key}`);
      }
    }
  }
}
