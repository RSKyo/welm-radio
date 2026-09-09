import {
  assertNonBlankStringArray,
  assertPlainObjectArray,
  assertKeyExists,
  assertKeyNotExists,
  assertHtmlElement,
  assertFunction,
  assertHtmlElement,
  assertNonBlankString,
} from "./assert.js";
import { EventRegistry } from "../../js/event.js";

// Elements are stored by reference.
// The element in the Map and the element in the DOM are the same object.
export class ElmDom {
  #rootElement;
  #rootEvents = [];
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

  clear(key) {
    if (key == null) {
      while (this.size > 0) {
        const keys = this.keys();
        this.remove(keys.at(-1));
      }
      return;
    }

    assertKeyExists(key, this.#elementMap, "key");

    // Remove all descendants while preserving the element itself.
    for (const childKey of this.childKeys(key)) {
      this.remove(childKey);
    }
  }

  destroy() {
    this.clear();

    for (const event of this.#rootEvents) {
      this.#rootElement.removeEventListener(event.eventType, event.wrapper);
    }

    this.#rootElement = null;
    this.#rootEvents = [];
  }

 

  get(key, ...selectors) {
    assertKeyExists(key, this.#elementMap, "key");
    assertNonBlankStringArray(selectors, "selectors");

    const element = this.#elementMap.get(key);
    if (selectors.length === 0) {
      return element;
    }

    return this.#queryElements(element, ...selectors);
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

    const oldElement = this.#elementMap.get(key);

    for (const element of this.#elementMap.values()) {
      if (oldElement.contains(element)) {
        newElement.appendChild(element);
      }
    }

    const events = this.#eventRegistry.getEvents(current);
    for (const event of events) {
      oldElement.removeEventListener(event.eventType, event.wrapper);
      newElement.addEventListener(event.eventType, event.wrapper);
    }

    oldElement.replaceWith(newElement);
    this.#elementMap.set(key, newElement);
  }

  remove(key) {
    assertKeyExists(key, this.#elementMap, "key");

    // Remove all child elements recursively.
    for (const childKey of this.childKeys(key)) {
      this.remove(childKey);
    }

    const current = this.#elementMap.get(key);

    // update the parent's childKeys to remove the child being removed
    const parentKey = this.#getParentKey(key);
    if (parentKey != null) {
      const parent = this.#elementMap.get(parentKey);
      parent.childKeys = parent.childKeys.filter((k) => k !== key);
    }

    // Remove all event listeners from the element.
    const events = this.#eventRegistry.getEvents(current);
    for (const event of events) {
      current.removeEventListener(event.eventType, event.wrapper);
    }

    current.remove();
    this.#elementMap.delete(key);
  }

  

  keys() {
    return [...this.#elementMap.keys()];
  }

  childKeys(key) {
    assertKeyExists(key, this.#elementMap, "key");

    return [...this.#elementMap.get(key).childKeys];
  }

  elements() {
    return Array.from(this.#elementMap.values());
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
    assertFunction(callback, "callback");

    for (const [key, item] of this.#elementMap.entries()) {
      callback(key, item, this.#getParentKey(key));
    }
  }

  on(key, type, handler, selector) {
    assertKeyExists(key, this.#elementMap, "key");
    const element = this.#elementMap.get(key);

    let targetElement = element;
    if (selector != null) {
      assertNonBlankString(selector, "selector");
      targetElement = element.querySelector(selector);
    }

    this.#registerEvent(targetElement, type, handler);
  }

  off(key, type, handler, selector) {
    assertKeyExists(key, this.#elementMap, "key");
    let element = this.#elementMap.get(key);

    if (selector != null) {
      assertNonBlankString(selector, "selector");
      element = element.querySelector(selector);
    }

    this.#unregisterEvent(element, type, handler);
  }

  onRoot(type, handler) {
    this.#registerEvent(this.#rootElement, type, handler);
  }

  offRoot(type, handler) {
    this.#unregisterEvent(this.#rootElement, type, handler);
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

  #queryElements(element, ...selectors) {
    assertHtmlElement(element, "element");
    assertNonEmptyNonBlankStringArray(selectors, "selectors");

    return selectors.map((selector) => {
      let el;

      try {
        el = element.querySelector(selector);
      } catch {
        throw new Error(`selector must be a valid CSS selector: ${selector}`);
      }

      assertHtmlElement(el, `element matching selector "${selector}"`);

      return el;
    });
  }
}
