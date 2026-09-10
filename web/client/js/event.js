import {
  assertHtmlElement,
  assertNonBlankString,
  assertFunction,
  assertBoolean,
  assertPlainObject,
} from "./assert.js";

export class EventRegistry {
  #events = [];

  on(
    element,
    type,
    handler,
    { detail = null, selector = null, unmatchedHandler = null } = {},
  ) {
    assertHtmlElement(element, "element");
    assertNonBlankString(type, "type");
    assertFunction(handler, "handler");
    if (detail != null) {
      assertPlainObject(detail, "detail");
    }
    if (selector != null) {
      assertNonBlankString(selector, "selector");
      try {
        element.querySelector(selector);
      } catch {
        throw new Error(`selector must be a valid CSS selector: ${selector}`);
      }
    }
    if (unmatchedHandler != null) {
      assertFunction(unmatchedHandler, "unmatchedHandler");
    }

    if (this.#has(element, type, handler)) {
      return;
    }

    detail = detail == null ? {} : { ...detail };

    const wrapper = (event) => {
      if (selector == null) {
        handler(event, detail);
        return;
      }

      const matchedElement = this.#closestElement(event, selector);

      if (matchedElement == null) {
        unmatchedHandler?.(event, detail);
        return;
      }

      handler(event, {
        ...detail,
        element: matchedElement,
      });
    };

    element.addEventListener(type, wrapper);

    this.#events.push({
      element,
      type,
      wrapper,
      handler,
    });
  }

  off({ element, type = null, handler = null, subtree = false } = {}) {
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

  #has(element, type, handler) {
    return this.#events.some(
      (event) =>
        event.element === element &&
        event.type === type &&
        event.handler === handler,
    );
  }

  #closestElement(event, selector) {
    const { target, currentTarget } = event;

    if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
      return null;
    }

    const element = target.closest(selector);

    if (element == null || !currentTarget.contains(element)) {
      return null;
    }

    return element;
  }
}
