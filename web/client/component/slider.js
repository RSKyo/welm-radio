import { Elm } from "./base/elm.js";
import {
  assertNumber,
  assertPositive,
  assertNonBlankString,
  assertFunction,
  assertBoolean,
} from "./base/assert.js";

const ROOT_CLASS = "slider";

const TEMPLATE = `
<div>
  <button type="button" data-role="decrease">−</button>
  <input type="range" data-role="range">
  <button type="button" data-role="increase">+</button>
  <div class="slider-text-field" data-role="percent">
      <input type="text" data-role="percent-input">
      <span>%</span>
  </div>
  <div class="slider-text-field" data-role="value">
    <input type="text" data-role="value-input">
    <span data-role="suffix"></span>
  </div>
</div>
`;

export class Slider extends Elm {
  // state
  #base = 100;
  #min = 0;
  #max = 100;
  #step = 1;
  #value = 0;
  #suffix = "";
  #showPercent = true;
  #showValue = true;

  #percent;
  #minPercent;
  #maxPercent;

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
    this.#base = options.base ?? this.dataset.base ?? this.#base;
    this.#min = options.min ?? this.dataset.min ?? this.#min;
    this.#max = options.max ?? this.dataset.max ?? this.#max;
    this.#step = options.step ?? this.dataset.step ?? this.#step;
    this.#value = options.value ?? this.dataset.value ?? this.#value;
    this.#suffix = options.suffix ?? this.dataset.suffix ?? this.#suffix;
    this.#showPercent =
      options.showPercent ?? this.dataset.showPercent ?? this.#showPercent;
    this.#showValue =
      options.showValue ?? this.dataset.showValue ?? this.#showValue;

    assertNumber(this.#base, "base");
    assertNumber(this.#min, "min");
    assertNumber(this.#max, "max");
    assertPositive(this.#step, "step");
    assertNumber(this.#value, "value");
    assertNonBlankString(this.#suffix, "suffix");
    assertBoolean(this.#showPercent, "showPercent");
    assertBoolean(this.#showValue, "showValue");

    if (this.#max <= this.#min) {
      throw new Error("max must be greater than min");
    }

    if (this.#value < this.#min || this.#value > this.#max) {
      throw new Error("value must be between min and max");
    }

    if (this.#suffix !== "") {
      assertNonBlankString(this.#suffix, "suffix");
    }

    this.#percent = Number((this.#value / this.#base).toFixed(2));
    this.#minPercent = Number((this.#min / this.#base).toFixed(2));
    this.#maxPercent = Number((this.#max / this.#base).toFixed(2));
  }

  // -----------------------------------------------------------------------------
  // percent
  // -----------------------------------------------------------------------------

  get percent() {
    return this.#percent;
  }

  set percent(percent) {
    assertNumber(percent, "percent");
    this.#setPercent(percent);
  }

  #setPercent(percent) {
    if (percent === this.#percent) {
      return;
    }

    const normalizedPercent = Math.min(
      this.#maxPercent,
      Math.max(this.#minPercent, percent),
    );

    this.#percent = Number(normalizedPercent.toFixed(2));
    this.#value = Number((this.#base * normalizedPercent).toFixed(2));
    this.#updateState();

    this.#onChange?.({
      percent: this.#percent,
      value: this.#value,
    });
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
    this.dom.on("decrease", "click", this.#handleDecreaseClick);
    this.dom.on("increase", "click", this.#handleIncreaseClick);
    this.dom.on(
      "percentField",
      "blur",
      this.#handlePercentBlur,
      '[data-role="percent-input"]',
    );
    this.dom.on(
      "percentField",
      "keydown",
      this.#handlePercentKeydown,
      '[data-role="percent-input"]',
    );
    this.dom.on(
      "valueField",
      "blur",
      this.#handleValueBlur,
      '[data-role="value-input"]',
    );
    this.dom.on(
      "valueField",
      "keydown",
      this.#handleValueKeydown,
      '[data-role="value-input"]',
    );
  }

  #handleRangeInput = ({ target }) => {
    this.#setValue(Number(target.value));
  };

  #handleDecreaseClick = () => {
    this.#setValue(this.#value - this.#step);
  };

  #handleIncreaseClick = () => {
    this.#setValue(this.#value + this.#step);
  };

  #handlePercentBlur = (event) => {
    const value = event.target.value.trim();
    if (value === "") {
      this.#updateState();
      return;
    }

    this.#setPercent(Number(value) / 100);
  };

  #handlePercentKeydown = (event) => {
    if (event.key === "Enter") {
      this.#handlePercentBlur(event);
    }
  };

  #handleValueBlur = (event) => {
    const value = event.target.value.trim();
    if (value === "") {
      this.#updateState();
      return;
    }
    
    this.#setValue(Number(event.target.value));
  };

  #handleValueKeydown = (event) => {
    if (event.key === "Enter") {
      this.#handleValueBlur(event);
    }
  };

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const template = this.createElementByHTML(TEMPLATE);

    const decreaseElement = template.querySelector('[data-role="decrease"]');
    const rangeElement = template.querySelector('[data-role="range"]');
    const increaseElement = template.querySelector('[data-role="increase"]');
    const percentField = template.querySelector('[data-role="percent"]');
    const valueField = template.querySelector('[data-role="value"]');

    percentField.classList.toggle("hidden", !this.#showPercent);
    valueField.classList.toggle("hidden", !this.#showValue);

    this.dom.add("decrease", decreaseElement);
    this.dom.add("range", rangeElement);
    this.dom.add("increase", increaseElement);
    this.dom.add("percentField", percentField);
    this.dom.add("valueField", valueField);
  }

  #updateState() {
    const rangeElement = this.dom.get("range");

    const percentField = this.dom.get("percentField");
    const percentElement = percentField.querySelector(
      '[data-role="percent-input"]',
    );

    const valueField = this.dom.get("valueField");
    const valueElement = valueField.querySelector('[data-role="value-input"]');
    const valueSuffixElement = valueField.querySelector("span");

    rangeElement.min = this.#min;
    rangeElement.max = this.#max;
    rangeElement.step = this.#step;
    rangeElement.value = this.#value;

    percentElement.value = Number((this.#percent * 100).toFixed(2));
    valueElement.value = this.#value;
    valueSuffixElement.textContent = this.#suffix;
  }
}
