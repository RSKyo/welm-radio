import { Elm } from "./base/elm.js";
import {
  isNullishOrEmpty,
  assertNumber,
  assertNonBlankString,
  assertFunction,
  isNonBlankString,
} from "./base/assert.js";

const ROOT_CLASS = "timeline-slider";
const INNERHTML = `
<button
    type="button"
    class="timeline-slider-prev"
    data-role="prev"
>
</button>
<button
    type="button"
    class="timeline-slider-next"
    data-role="next"
>
</button>
<input
    type="range"
    class="timeline-slider-range"
    data-role="range"
>
<div
    class="timeline-slider-value"
    data-role="value"
>
</div>
`;

export class TimelineSlider extends Elm {
  // state
  #prevText = "-";
  #nextText = "+";
  #suffix = "%";
  #minValueText;
  #maxValueText;
  #percentBase = 100;
  #min = 0;
  #max = 100;
  #step = 1;
  #value = 0;

  // event
  #onChange;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });

    this.#initOptions(options);
    this.#render();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // options
  // -----------------------------------------------------------------------------

  #initOptions(options) {
    this.#prevText =
      options.prevText ?? this.dataset.prevText ?? this.#prevText;
    this.#nextText =
      options.nextText ?? this.dataset.nextText ?? this.#nextText;
    this.#suffix = options.suffix ?? this.dataset.suffix ?? this.#suffix;
    this.#minValueText =
      options.minValueText ?? this.dataset.minValueText ?? this.#minValueText;
    this.#maxValueText =
      options.maxValueText ?? this.dataset.maxValueText ?? this.#maxValueText;
    // percentBase can be null
    if (Object.hasOwn(options, "percentBase")) {
      this.#percentBase = options.percentBase;
    } else if (this.dataset.percentBase != null) {
      this.#percentBase = this.dataset.percentBase;
    }
    this.#min = options.min ?? this.dataset.min ?? this.#min;
    this.#max = options.max ?? this.dataset.max ?? this.#max;
    this.#step = options.step ?? this.dataset.step ?? this.#step;
    this.#value = options.value ?? this.dataset.value ?? this.#value;

    assertNonBlankString(this.#prevText, "prevText");
    assertNonBlankString(this.#nextText, "nextText");
    if (this.#percentBase != null) {
      assertNumber(this.#percentBase, "percentBase");

      if (this.#percentBase === 0) {
        throw new Error("percentBase must not be 0");
      }
    }
    assertNumber(this.#min, "min");
    assertNumber(this.#max, "max");
    assertNumber(this.#step, "step");
    assertNumber(this.#value, "value");

    if (this.#max <= this.#min) {
      throw new Error("max must be greater than min");
    }

    if (this.#value < this.#min || this.#value > this.#max) {
      throw new Error("value must be between min and max");
    }
  }

  // -----------------------------------------------------------------------------
  // value
  // -----------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  set value(value) {
    assertNumber(value, "value");
    this.#setValue(value);
  }

  #setValue(value) {
    if (value === this.#value) {
      return;
    }

    const normalizedValue = Math.min(this.#max, Math.max(this.#min, value));
    this.#value = Number(normalizedValue.toFixed(2));
    this.#updateState();

    this.#onChange?.(this.#value);
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const [prevEl, nextEl, rangeEl, valueEl] =
      this.createElementsByHTML(INNERHTML);

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

    this.#updateState();
  }

  #updateState() {
    const rangeEl = this.dom.get("range");
    rangeEl.min = this.#min;
    rangeEl.max = this.#max;
    rangeEl.step = this.#step;
    rangeEl.value = this.#value;

    const ratio = (this.#value - this.#min) / (this.#max - this.#min);
    const progress = Number((ratio * 100).toFixed(2));
    rangeEl.style.setProperty("--range-progress", `${progress}%`);

    const valueEl = this.dom.get("value");
    if (this.#value === this.#min && isNonBlankString(this.#minValueText)) {
      valueEl.textContent = this.#minValueText;
    } else if (
      this.#value === this.#max &&
      isNonBlankString(this.#maxValueText)
    ) {
      valueEl.textContent = this.#maxValueText;
    } else {
      if (isNullishOrEmpty(this.#percentBase)) {
        valueEl.textContent = `${this.#value > 0 ? "+" : ""}${this.#value}${this.#suffix}`;
      } else {
        const percent = Number(
          ((this.#value / this.#percentBase) * 100).toFixed(2),
        );
        valueEl.textContent = `${percent}%`;
      }
    }

    const rootElWidth = this.rootElement.clientWidth;
    const prevElWidth = this.dom.get("prev").offsetWidth;
    const nextElWidth = this.dom.get("next").offsetWidth;

    const rawLeft = ratio * rootElWidth;
    const valueElWidth = valueEl.offsetWidth;
    const minLeft = prevElWidth + valueElWidth / 2;
    const maxLeft = rootElWidth - nextElWidth - valueElWidth / 2;

    const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);

    valueEl.style.left = `${left}px`;
    valueEl.style.transform = "translateX(-50%)";
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

  // override
  rootElementResize() {
    console.log("rootElementResize", this.rootElement.clientWidth);
    this.#updateState();
  }

  set onChange(handler) {
    if (handler != null) {
      assertFunction(handler, "handler");
      this.#onChange = handler;
      return;
    }

    this.#onChange = null;
  }

  #bindEvents() {
    this.dom.on("range", "input", this.#handleRangeInput);
    this.dom.on("prev", "click", this.#handlePrevClick);
    this.dom.on("next", "click", this.#handleNextClick);
  }

  #handleRangeInput = ({ target }) => {
    this.#setValue(Number(target.value));
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
}

/**
 * -60 dB ≈ gain 0.001
 * 0 dB = gain 1
 * +12 dB ≈ gain 3.98
 */
const MIN_DB = -60;
const MAX_DB = 12;
const DEFAULT_STEP = 0.5;
const DEFAULT_VALUE = 0;
export class TimelineGainSlider extends TimelineSlider {
  constructor(root, options = {}) {
    timelineGainSliderValidateOptions(options);

    super(root, {
      step: DEFAULT_STEP,
      value: DEFAULT_VALUE,
      ...options,
      min: MIN_DB,
      max: MAX_DB,
      percentBase: null,
      suffix: "dB",
      minValueText: "-∞",
    });
  }

  get gain() {
    if (this.value === MIN_DB) {
      return 0;
    }

    return this.dbToGain(this.value);
  }

  dbToGain(db) {
    return 10 ** (db / 20);
  }

  gainToDb(gain) {
    return Math.max(20 * Math.log10(gain), MIN_DB);
  }
}

function timelineGainSliderValidateOptions(options) {
  const step = options.step ?? DEFAULT_STEP;
  const value = options.value ?? DEFAULT_VALUE;

  if (step <= 0 || step > MAX_DB - MIN_DB) {
    throw new Error(
      `step must be greater than 0 and less than or equal to ${
        MAX_DB - MIN_DB
      }`,
    );
  }

  if (value < MIN_DB || value > MAX_DB) {
    throw new Error(`value must be between ${MIN_DB} and ${MAX_DB}`);
  }
}
