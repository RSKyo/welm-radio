import { Elm } from "./base/elm.js";
import {
  assertNumber,
  assertPositive,
  assertNonBlankString,
  assertFunction,
  assertBoolean,
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
    class="timeline-slider-percent"
    data-role="percent"
>
</div>
`;
const MIN_PERCENT_LEFT = 12;
const MAX_PERCENT_LEFT = 85;

export class TimelineSlider extends Elm {
  // state
  #prevText = "-";
  #nextText = "+";
  #base = 100;
  #min = 0;
  #max = 100;
  #step = 1;
  #value = 0;
  #percent = 0;

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
    this.#updateState();
  }

  // -----------------------------------------------------------------------------
  // options
  // -----------------------------------------------------------------------------

  #initOptions(options) {
    this.#prevText =
      options.prevText ?? this.dataset.prevText ?? this.#prevText;
    this.#nextText =
      options.nextText ?? this.dataset.nextText ?? this.#nextText;
    this.#base = options.base ?? this.dataset.base ?? this.#base;
    this.#min = options.min ?? this.dataset.min ?? this.#min;
    this.#max = options.max ?? this.dataset.max ?? this.#max;
    this.#step = options.step ?? this.dataset.step ?? this.#step;
    this.#value = options.value ?? this.dataset.value ?? this.#value;

    assertNonBlankString(this.#prevText, "prevText");
    assertNonBlankString(this.#nextText, "nextText");
    assertNumber(this.#base, "base");
    assertNumber(this.#min, "min");
    assertNumber(this.#max, "max");
    assertPositive(this.#step, "step");
    assertNumber(this.#value, "value");

    if (this.#max <= this.#min) {
      throw new Error("max must be greater than min");
    }

    if (this.#value < this.#min || this.#value > this.#max) {
      throw new Error("value must be between min and max");
    }

    this.#percent = Number((this.#value / this.#base).toFixed(2));
  }

  // -----------------------------------------------------------------------------
  // percent
  // -----------------------------------------------------------------------------

  get percent() {
    return this.#percent;
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

    this.#percent = Number((normalizedValue / this.#base).toFixed(2));
    this.#value = Number(normalizedValue.toFixed(2));
    this.#updateState();

    this.#onChange?.({
      percent: this.#percent,
      value: this.#value,
    });
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const [prevEl, nextEl, rangeEl, percentEl] =
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
    this.dom.add("percent", percentEl);

    this.#updateState();
  }

  #updateState() {
    const percentEl = this.dom.get("percent");

    const percent = Number((this.#percent * 100).toFixed(2));
    percentEl.textContent = `${percent}%`;

    const ratio = (this.#value - this.#min) / (this.#max - this.#min);

    const left =
      MIN_PERCENT_LEFT + ratio * (MAX_PERCENT_LEFT - MIN_PERCENT_LEFT);

    percentEl.style.left = `${left}%`;
    percentEl.style.transform = "translateX(-50%)";
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

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
