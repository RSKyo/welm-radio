import {
  isNullishOrEmpty,
  assertNumber,
  assertNonBlankString,
  isNonBlankString,
  assertNonNegativeInteger,
  assertPositive,
} from "./base/assert.js";
import { createElementByHTML } from "./base/elm-helper.js";
import { Elm } from "./base/elm.js";

const TEMPLATE = `
<button
    type="button"
    class="slider-prev"
    data-role="prev"
>
</button>
<button
    type="button"
    class="slider-next"
    data-role="next"
>
</button>
<input
    type="range"
    class="slider-range"
    data-role="range"
>
<div
    class="slider-value"
    data-role="value"
>
</div>
`;
const [prevTemplate, nextTemplate, rangeTemplate, valueTemplate] =
  createElementByHTML(TEMPLATE);

export class Slider extends Elm {
  // state
  #prevText = "-";
  #nextText = "+";
  #suffix = "%";
  #minValueText;
  #maxValueText;
  #fixed = 2;
  #percentBase = null;
  #min = 0;
  #max = 100;
  #step = 1;
  #value = 0;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "slider",
    });

    this.#init();
    this.#render();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("prevText", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#prevText = value;
    });

    this.resolveOption("nextText", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#nextText = value;
    });

    this.resolveOption("suffix", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#suffix = value;
    });

    this.resolveOption("minValueText", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#minValueText = value;
    });

    this.resolveOption("maxValueText", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#maxValueText = value;
    });

    this.resolveOption("fixed", (value, assertionSubject) => {
      assertNonNegativeInteger(value, assertionSubject);
      this.#fixed = value;
    });

    this.resolveOption("step", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#step = value;
    });

    this.resolveOption("percentBase", (value, assertionSubject) => {
      assertNumber(value, assertionSubject);

      if (value === 0) {
        throw new Error("percentBase must not be 0");
      }

      this.#percentBase = value;
    });

    this.resolveOption("min", (value, assertionSubject) => {
      assertNumber(value, assertionSubject);
      this.#min = value;
    });

    this.resolveOption("max", (value, assertionSubject) => {
      assertNumber(value, assertionSubject);
      this.#max = value;
    });

    this.resolveOption("value", (value, assertionSubject) => {
      assertNumber(value, assertionSubject);
      const normalizedValue = Math.min(this.#max, Math.max(this.#min, value));
      this.#value = normalizedValue;
    });

    if (this.#max <= this.#min) {
      throw new Error("max must be greater than min");
    }
  }

  // -----------------------------------------------------------------------------
  // get/set state value
  // -----------------------------------------------------------------------------

  get min() {
    return this.#min;
  }

  get max() {
    return this.#max;
  }

  get step() {
    return this.#step;
  }

  get fixed() {
    return this.#fixed;
  }

  get value() {
    return this.#value;
  }

  set value(value) {
    assertNumber(value, "value");
    this.#setValue(value);
  }

  #setValue(value) {
    const newValue = Math.min(this.#max, Math.max(this.#min, value));

    if (newValue === this.#value) {
      return;
    }

    this.#value = newValue;
    this.#updateUIState();

    this.#emitChange(this.#value);
  }

  get ratio() {
    return (this.#value - this.#min) / (this.#max - this.#min);
  }

  get progress() {
    return Number((this.ratio * 100).toFixed(this.#fixed));
  }

  get percent() {
    if (this.#percentBase == null) {
      return this.progress;
    }

    return Number(
      ((this.#value / this.#percentBase) * 100).toFixed(this.#fixed),
    );
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onChange(handler) {
    this.handlerRegistry.set("onChange", handler);
  }

  #emitChange(newValue) {
    this.handlerRegistry.emit("onChange", {
      elm: this,
      value: newValue,
    });
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const prevEl = prevTemplate.cloneNode(true);
    const nextEl = nextTemplate.cloneNode(true);
    const rangeEl = rangeTemplate.cloneNode(true);
    const valueEl = valueTemplate.cloneNode(true);

    prevEl.textContent = this.#prevText;
    nextEl.textContent = this.#nextText;

    rangeEl.min = this.#min;
    rangeEl.max = this.#max;
    rangeEl.step = this.#step;
    rangeEl.value = this.#value;

    this.dom.add("prev", prevEl);
    this.dom.add("next", nextEl);
    this.dom.add("range", rangeEl);
    this.dom.add("value", valueEl);

    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.onResize = () => {
      this.#updateUIState();
    };

    this.dom.on("range", "input", this.#handleRangeInput);
    this.dom.on("prev", "click", this.#handlePrevClick);
    this.dom.on("next", "click", this.#handleNextClick);
  }

  #handleRangeInput = (event) => {
    this.#setValue(Number(event.target.value));
  };

  #handlePrevClick = () => {
    let value = this.#value - this.#step;
    value = value < this.#min ? this.#min : value;
    this.#setValue(value);
  };

  #handleNextClick = () => {
    let value = this.#value + this.#step;
    value = value > this.#max ? this.#max : value;
    this.#setValue(value);
  };

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateUIState() {
    const rangeEl = this.dom.get("range");

    rangeEl.min = this.#min;
    rangeEl.max = this.#max;
    rangeEl.step = this.#step;
    rangeEl.value = this.#value;

    rangeEl.style.setProperty("--range-progress", `${this.progress}%`);

    const valueEl = this.dom.get("value");

    if (this.#value === this.#min && isNonBlankString(this.#minValueText)) {
      valueEl.textContent = this.#minValueText;
    } else if (
      this.#value === this.#max &&
      isNonBlankString(this.#maxValueText)
    ) {
      valueEl.textContent = this.#maxValueText;
    } else if (this.#percentBase == null) {
      valueEl.textContent = `${this.#value > 0 ? "+" : ""}${this.#value}${this.#suffix}`;
    } else {
      valueEl.textContent = `${this.percent}%`;
    }

    const rootElWidth = this.rootElement.clientWidth;
    const prevElWidth = this.dom.get("prev").offsetWidth;
    const nextElWidth = this.dom.get("next").offsetWidth;

    const rawLeft = this.ratio * rootElWidth;

    const valueElWidth = valueEl.offsetWidth;
    const minLeft = prevElWidth + valueElWidth / 2;
    const maxLeft = rootElWidth - nextElWidth - valueElWidth / 2;

    const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);

    valueEl.style.left = `${left}px`;
    valueEl.style.transform = "translateX(-50%)";
  }
}

/**
 * -60 dB ≈ gain 0.001
 * 0 dB = gain 1
 * +12 dB ≈ gain 3.98
 */
export class GainSlider extends Slider {
  constructor(root, options = {}) {
    super(root, {
      step: 0.5,
      value: 0,
      ...options,
      min: -60,
      max: 12,
      percentBase: null,
      suffix: "dB",
      minValueText: "-∞",
    });
  }

  get gain() {
    if (this.value === this.min) {
      return 0;
    }

    return this.dbToGain(this.value);
  }

  dbToGain(db) {
    return 10 ** (db / 20);
  }

  gainToDb(gain) {
    return Math.max(20 * Math.log10(gain), this.min);
  }
}
