import {
  assertBoolean,
  assertNumber,
  assertNonBlankString,
  isNonBlankString,
  assertNonNegativeInteger,
  assertPositive,
} from "./base/assert.js";
import { createElementByHTML, getBySelector } from "./base/helper.js";
import { Elm } from "./base/elm.js";

const MAIN_TEMPLATE = `
<div class="slider-main" data-role="slider-main">
  <button
      type="button"
      class="slider-prev"
      data-role="slider-prev"
  >
  </button>
  <div
      class="slider-label"
      data-role="slider-label"
  >
  </div>
  <button
      type="button"
      class="slider-next"
      data-role="slider-next"
  >
  </button>
  <input
      type="range"
      class="slider-range"
      data-role="slider-range"
  >
  <div
      class="slider-value"
      data-role="slider-value"
  >
  </div>
</div>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);

export class Slider extends Elm {
  // state
  #labelText = "";
  #prevText = "-";
  #nextText = "+";
  #suffix = null;
  #minValueText = null;
  #maxValueText = null;
  #zeroValueText = null;
  #fixed = 2;
  #percentBase = null;
  #min = 0;
  #max = 100;
  #step = 1;
  #value = 0;
  #showActions = false;
  // element
  #mainEl = null;
  #rangeEl = null;
  #prevEl = null;
  #nextEl = null;
  #valueEl = null;
  #labelEl = null;

  constructor(root, options = {}) {
    super(root, {
      defaultRootClass: "slider",
      ...options,
    });

    this.#init();
    this.#render();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("labelText", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#labelText = value;
    });

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

    this.resolveOption("zeroValueText", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#zeroValueText = value;
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

    this.resolveOption("showActions", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#showActions = value;
    });

    if (this.#max <= this.#min) {
      throw new Error("max must be greater than min");
    }

    this.resolveOption("color", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.rootElement.style.setProperty("--color-slider", value);
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
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
  // state(read-write)
  // -----------------------------------------------------------------------------

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

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onChange(handler) {
    this.handler.set("changeHandler", handler);
  }

  #emitChange(value) {
    this.handler.emit("changeHandler", {
      elm: this,
      value,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.onResize = () => {
      this.#updateUIState();
    };

    this.event.on(this.#rangeEl, "input", this.#rangeInputHandler);
    this.event.on(this.#prevEl, "click", this.#prevClickHandler);
    this.event.on(this.#nextEl, "click", this.#nextClickHandler);
  }

  #rangeInputHandler = (event) => {
    this.#setValue(Number(event.target.value));
  };

  #prevClickHandler = () => {
    let value = this.#value - this.#step;
    this.#rangeEl.value = value;
    this.#setValue(value);
  };

  #nextClickHandler = () => {
    let value = this.#value + this.#step;
    this.#rangeEl.value = value;
    this.#setValue(value);
  };

  #valueInputBlurHandler = (event) => {
    const inputEl = event.currentTarget;
    const value = inputEl.valueAsNumber;

    if (Number.isNaN(value)) {
      inputEl.value = this.#value;
      return;
    }

    this.value = value;
    inputEl.value = this.#value;
  };

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateUIState() {
    this.#rangeEl.style.setProperty("--range-progress", `${this.progress}%`);

    // valueEl
    if (this.#value === this.#min && isNonBlankString(this.#minValueText)) {
      this.#valueEl.textContent = this.#minValueText;
    } else if (
      this.#value === this.#max &&
      isNonBlankString(this.#maxValueText)
    ) {
      this.#valueEl.textContent = this.#maxValueText;
    } else if (this.#value === 0 && isNonBlankString(this.#zeroValueText)) {
      this.#valueEl.textContent = this.#zeroValueText;
    } else if (this.#suffix === "%") {
      this.#valueEl.textContent = this.percent + "%";
    } else {
      this.#valueEl.textContent = this.formatValue({
        min: this.#min,
        max: this.#max,
        value: this.#value,
        suffix: this.#suffix,
      });
    }

    // valueEl left
    const mainWidth = this.#mainEl.clientWidth;
    const prevElWidth = this.#prevEl.offsetWidth;
    const nextElWidth = this.#nextEl.offsetWidth;

    const rawLeft = this.ratio * mainWidth;

    const valueElWidth = this.#valueEl.offsetWidth;
    const minLeft = prevElWidth + valueElWidth / 2;
    const maxLeft = mainWidth - nextElWidth - valueElWidth / 2;
    const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);

    this.#valueEl.style.left = `${left}px`;
  }

  // can be overridden by subclasses to format the value display
  formatValue({ min, max, value, suffix }) {
    return `${value}${suffix ?? ""}`;
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const mainEl = mainTemplate.cloneNode(true);
    const [labelEl, rangeEl, prevEl, nextEl, valueEl] = getBySelector(
      mainEl,
      '[data-role="slider-label"]',
      '[data-role="slider-range"]',
      '[data-role="slider-prev"]',
      '[data-role="slider-next"]',
      '[data-role="slider-value"]',
    );

    labelEl.textContent = this.#labelText;

    rangeEl.min = this.#min;
    rangeEl.max = this.#max;
    rangeEl.step = this.#step;
    rangeEl.value = this.#value;

    prevEl.textContent = this.#prevText;
    nextEl.textContent = this.#nextText;

    this.#mainEl = mainEl;
    this.#rangeEl = rangeEl;
    this.#prevEl = prevEl;
    this.#nextEl = nextEl;
    this.#valueEl = valueEl;
    this.#labelEl = labelEl;

    this.rootElement.appendChild(mainEl);

    this.#updateUIState();
  }
}

export class CompactSlider extends Slider {
  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "slider slider-compact",
    });
  }
}

/**
 * -60 dB ≈ gain 0.001
 * 0 dB = gain 1
 * +12 dB ≈ gain 3.98
 */
export class CompactGainSlider extends CompactSlider {
  constructor(root, options = {}) {
    super(root, {
      step: 0.5,
      value: 0,
      ...options,
      min: -60,
      max: 12,
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

/**
 * -1 = full left
 *  0 = center
 * +1 = full right
 */
export class CompactPanSlider extends CompactSlider {
  constructor(root, options = {}) {
    super(root, {
      step: 0.01,
      value: 0,
      ...options,
      min: -1,
      max: 1,
      minValueText: "L",
      maxValueText: "R",
      zeroValueText: "C",
    });
  }

  // override
  formatValue({ min, max, value, suffix }) {
    const amount = Math.round(Math.abs(value) * 100);
    return value < 0 ? `L${amount}` : `R${amount}`;
  }
}
