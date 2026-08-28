import { Elm } from "./base/elm.js";
import {
  assertInteger,
  assertFunction,
} from "./base/assert.js";

const ROOT_CLASS = "timeline-zoom";

const MIN_VALUE = 20;
const MAX_VALUE = 500;
const STEP = 20;
const DEFAULT_VALUE = 100;

const TEMPLATE = `
<button class="timeline-zoom-out" type="button">−</button>

<div class="timeline-zoom-input-wrap">
  <input
    class="timeline-zoom-input"
    type="number"
    min="${MIN_VALUE}"
    max="${MAX_VALUE}"
    value="${DEFAULT_VALUE}"
  >
  <span class="timeline-zoom-percent">%</span>
</div>

<button class="timeline-zoom-in" type="button">+</button>
`;

export class TimelineZoom extends Elm {
  #value = DEFAULT_VALUE;

  #onChange;

  constructor(root) {
    super(root, {
      rootClass: ROOT_CLASS,
    });

    this.#render();
    this.#bindEvents();
  }

  // ---------------------------------------------------------------------------
  // value
  // ---------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  set value(value) {
    assertInteger(value, "value");

    this.#setValue(value);
  }

  // ---------------------------------------------------------------------------
  // events
  // ---------------------------------------------------------------------------

  set onChange(handler) {
    if (handler != null) {
      assertFunction(handler, "onChange");
    }

    this.#onChange = handler;
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.dom.clear();

    const elements = this.createElementsByHTML(TEMPLATE);

    for (const element of elements) {
      this.rootElement.appendChild(element);
    }
  }

  #updateValue() {
    const inputElement =
      this.rootElement.querySelector(".timeline-zoom-input");

    inputElement.value = this.#value;
  }

  // ---------------------------------------------------------------------------
  // value
  // ---------------------------------------------------------------------------

  #setValue(value, emitChange = false) {
    const newValue = Math.min(
      Math.max(value, MIN_VALUE),
      MAX_VALUE,
    );

    if (newValue === this.#value) {
      this.#updateValue();
      return;
    }

    this.#value = newValue;

    this.#updateValue();

    if (emitChange) {
      this.#onChange?.(this.#value);
    }
  }

  // ---------------------------------------------------------------------------
  // bind events
  // ---------------------------------------------------------------------------

  #bindEvents() {
    const zoomOutElement =
      this.rootElement.querySelector(".timeline-zoom-out");

    const zoomInElement =
      this.rootElement.querySelector(".timeline-zoom-in");

    const inputElement =
      this.rootElement.querySelector(".timeline-zoom-input");

    zoomOutElement.addEventListener("click", () => {
      this.#setValue(this.#value - STEP, true);
    });

    zoomInElement.addEventListener("click", () => {
      this.#setValue(this.#value + STEP, true);
    });

    inputElement.addEventListener("change", () => {
      const value = Number(inputElement.value);

      if (!Number.isInteger(value)) {
        this.#updateValue();
        return;
      }

      this.#setValue(value, true);
    });
  }
}