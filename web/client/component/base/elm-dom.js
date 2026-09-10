import {
  assertKeyExists,
  assertKeyNotExists,
  assertHtmlElement,
} from "./assert.js";
import { EventRegistry } from "../../js/event.js";

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

  get(key) {
    assertKeyExists(key, this.#elementMap, "key");
    return this.#get(key);
  }

  #get(key) {
    return this.#elementMap.get(key);
  }

  add(key, newElement, parentKey = null) {
    assertKeyNotExists(key, this.#elementMap);
    assertHtmlElement(newElement, "newElement");
    this.#assertElementIsNotRoot(newElement, "newElement");
    this.#assertElementNotExists(newElement, "newElement");

    const parentElement =
      parentKey == null ? this.#rootElement : this.get(parentKey);

    parentElement.appendChild(newElement);

    this.#elementMap.set(key, newElement);
  }

  replace(key, newElement) {
    assertKeyExists(key, this.#elementMap, "key");
    assertHtmlElement(newElement, "newElement");
    this.#assertElementIsNotRoot(newElement, "newElement");
    this.#assertElementNotExists(newElement, "newElement");

    const oldElement = this.#get(key);
    for (const child of this.getChildren(key)) {
      newElement.appendChild(child);
    }

    this.#eventRegistry.replace(oldElement, newElement);
    oldElement.replaceWith(newElement);
    this.#elementMap.set(key, newElement);
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

  on(
    key,
    type,
    handler,
    { detail = null, selector = null, unmatchedHandler = null } = {},
  ) {
    assertKeyExists(key, this.#elementMap, "key");
    const element = this.#get(key);

    this.#eventRegistry.on(element, type, handler, {
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
