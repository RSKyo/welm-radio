import {
  assertBoolean,
  assertNumber,
  assertNonBlankString,
  isNonBlankString,
  assertNonNegativeInteger,
  assertPositive,
} from "./base/assert.js";
import { createElementByHTML, getBySelector } from "./base/elm-helper.js";
import { Elm } from "./base/elm.js";

const MAIN_TEMPLATE = `
<div class="slider-main" data-role="main">
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
</div>
`;

const ACTIONS_TEMPLATE = `
<div class="slider-actions" data-role="actions">
  <input
      type="number"
      class="slider-value-input"
      data-role="value-input"
  >
</div>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);
const actionsTemplate = createElementByHTML(ACTIONS_TEMPLATE);

export class Slider extends Elm {
  // state
  #prevText = "-";
  #nextText = "+";
  #suffix = "%";
  #minValueText = null;
  #maxValueText = null;
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
  #valueInputEl = null;

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

    this.resolveOption("showActions", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#showActions = value;
    });

    if (this.#max <= this.#min) {
      throw new Error("max must be greater than min");
    }
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

    if (this.#showActions) {
      this.event.on(this.#valueInputEl, "blur", this.#valueInputBlurHandler);
    }
  }

  #rangeInputHandler = (event) => {
    this.#setValue(Number(event.target.value));
  };

  #prevClickHandler = () => {
    let value = this.#value - this.#step;
    this.#setValue(value);
  };

  #nextClickHandler = () => {
    let value = this.#value + this.#step;
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
    } else if (this.#percentBase == null) {
      this.#valueEl.textContent = `${this.#value > 0 ? "+" : ""}${this.#value}${this.#suffix}`;
    } else {
      this.#valueEl.textContent = `${this.percent}%`;
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
    this.#valueEl.style.transform = "translateX(-50%)";

    // valueInputEl
    if (this.#showActions) {
      this.#valueInputEl.value = this.#value;
    }
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    // main
    const mainEl = mainTemplate.cloneNode(true);
    const [rangeEl, prevEl, nextEl, valueEl] = getBySelector(
      mainEl,
      '[data-role="range"]',
      '[data-role="prev"]',
      '[data-role="next"]',
      '[data-role="value"]',
    );

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

    // actions
    const actionsEl = actionsTemplate.cloneNode(true);
    const valueInputEl = getBySelector(actionsEl, '[data-role="value-input"]');

    if (this.#showActions) {
      valueInputEl.min = this.#min;
      valueInputEl.max = this.#max;
      valueInputEl.step = this.#step;
    }

    this.#valueInputEl = valueInputEl;

    // add to the root element
    this.rootElement.appendChild(mainEl);
    if (this.#showActions) {
      this.rootElement.appendChild(actionsEl);
    }

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
export class GainCompactSlider extends CompactSlider {
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
