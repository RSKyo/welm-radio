export class EventDispatcher {
  #event;

  constructor(event) {
    this.#event = event;
  }

  target(selector) {
    const { target, currentTarget } = this.#event;

    if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
      return null;
    }

    const element = target.closest(selector);

    if (element == null || !currentTarget.contains(element)) {
      return null;
    }

    return element;
  }

  dispatch(selector, handler) {
    if (typeof handler !== "function") {
      throw new Error("handler must be a function");
    }

    const target = this.target(selector);
    if (target != null) {
      handler({ event: this.#event, target });
    }
  }
}