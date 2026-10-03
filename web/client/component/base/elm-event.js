import {
  assertHtmlElement,
  assertNonBlankString,
  assertFunction,
  assertValueIn,
} from "./assert.js";

export class ElmEvent {
  #events = [];

  #has(element, type, handler) {
    return this.#events.some(
      (event) =>
        event.element === element &&
        event.type === type &&
        event.handler === handler,
    );
  }

  on(element, type, handler, { selector = null } = {}) {
    assertHtmlElement(element, "element");
    assertNonBlankString(type, "type");
    assertFunction(handler, "handler");

    if (this.#has(element, type, handler)) {
      return;
    }

    if (type === "resizeElement") {
      if (selector != null) {
        throw new Error("selector is not supported for resizeElement");
      }

      const resizeObserver = new ResizeObserver((entries, observer) => {
        handler({ entries, observer });
      });

      resizeObserver.observe(element);

      this.#events.push({
        element,
        type,
        handler,
        resizeObserver,
      });

      return;
    }

    const wrapper = (event) => {
      if (selector != null) {
        const matchedElement = this.#closestElement(event, selector);
        if (matchedElement == null) {
          return;
        }
        handler(event, { element: matchedElement });
      } else {
        handler(event, { element: event.currentTarget });
      }
    };

    element.addEventListener(type, wrapper);

    this.#events.push({
      element,
      type,
      handler,
      wrapper,
    });
  }

  off({ element, type = null, handler = null, scope = "self" } = {}) {
    if (element != null) {
      assertHtmlElement(element, "element");
    }

    if (type != null) {
      assertNonBlankString(type, "type");
    }

    if (handler != null) {
      assertFunction(handler, "handler");
    }

    assertValueIn(scope, ["self", "subtree", "descendants"], "scope");

    for (let i = this.#events.length - 1; i >= 0; i--) {
      const event = this.#events[i];

      if (element != null) {
        if (scope === "self") {
          if (event.element !== element) {
            continue;
          }
        } else if (scope === "subtree") {
          if (event.element !== element && !element.contains(event.element)) {
            continue;
          }
        } else if (scope === "descendants") {
          if (event.element === element || !element.contains(event.element)) {
            continue;
          }
        }
      }

      if (type != null && event.type !== type) {
        continue;
      }

      if (handler != null && event.handler !== handler) {
        continue;
      }

      if (event.type === "resizeElement") {
        event.resizeObserver.disconnect();
      } else {
        event.element.removeEventListener(event.type, event.wrapper);
      }

      this.#events.splice(i, 1);
    }
  }

  migrate(oldElement, newElement) {
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
      if (event.type === "resizeElement") {
        event.resizeObserver.disconnect();
        event.resizeObserver.observe(newElement);
      } else {
        oldElement.removeEventListener(event.type, event.wrapper);
        newElement.addEventListener(event.type, event.wrapper);
      }

      event.element = newElement;
    }
  }

  #closestElement(event, selector) {
    assertNonBlankString(selector, "selector");

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
