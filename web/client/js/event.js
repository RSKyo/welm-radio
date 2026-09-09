import {
  assertHtmlElement,
  assertNonBlankString,
  assertFunction,
  assertBoolean,
} from "./assert.js";

export class EventRegistry {
  #events = [];

  on(element, type, handler) {
    assertHtmlElement(element, "element");
    assertNonBlankString(type, "type");
    assertFunction(handler, "handler");

    if (this.#has(element, type, handler)) {
      return;
    }

    const wrapper = (event) => {
      handler(event);
    };

    element.addEventListener(type, wrapper);

    this.#events.push({
      element,
      type,
      handler,
      wrapper,
    });
  }

  off(element, type, handler) {
    assertHtmlElement(element, "element");
    assertNonBlankString(type, "type");
    assertFunction(handler, "handler");

    const index = this.#index(element, type, handler);

    if (index === -1) {
      return;
    }

    const event = this.#events[index];

    event.element.removeEventListener(event.type, event.wrapper);
    this.#events.splice(index, 1);
  }

  replace(oldElement, newElement) {
    assertHtmlElement(oldElement, "oldElement");
    assertHtmlElement(newElement, "newElement");

    if (oldElement === newElement) {
      return;
    }

    const events = this.#events.filter((event) => event.element === oldElement);

    for (const event of events) {
      if (this.#has(newElement, event.type, event.handler)) {
        throw new Error("newElement already has registered events");
      }
    }

    for (const event of events) {
      oldElement.removeEventListener(event.type, event.wrapper);
      newElement.addEventListener(event.type, event.wrapper);

      event.element = newElement;
    }
  }

  clear(element, { type = null, handler = null, subtree = false } = {}) {
    if (element != null) {
      assertHtmlElement(element, "element");
    }

    if (type != null) {
      assertNonBlankString(type, "type");
    }

    if (handler != null) {
      assertFunction(handler, "handler");
    }

    assertBoolean(subtree, "subtree");

    for (let i = this.#events.length - 1; i >= 0; i--) {
      const event = this.#events[i];

      if (
        element != null &&
        event.element !== element &&
        !(subtree && element.contains(event.element))
      ) {
        continue;
      }

      if (type != null && event.type !== type) {
        continue;
      }

      if (handler != null && event.handler !== handler) {
        continue;
      }

      event.element.removeEventListener(event.type, event.wrapper);
      this.#events.splice(i, 1);
    }
  }

  #has(element, type, handler) {
    return this.#events.some(
      (event) =>
        event.element === element &&
        event.type === type &&
        event.handler === handler,
    );
  }

  #index(element, type, handler) {
    return this.#events.findIndex(
      (event) =>
        event.element === element &&
        event.type === type &&
        event.handler === handler,
    );
  }
}
