import { Elm } from "./base/elm.js";
import { createElementByHTML, getBySelector } from "./base/helper.js";
import {
  assertBoolean,
  assertNonBlankString,
  assertNonNegativeInteger,
  assertNumber,
  assertPositive,
} from "./base/assert.js";

const MAIN_TEMPLATE = `
<div class="tumbler-main">
  <div class="tumbler-ruler"></div>
</div>
`;

const TICK_TEMPLATE = `
<div class="tumbler-tick">
  <div class="tumbler-label"></div>
  <div class="tumbler-mark"></div>
</div>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);
const tickTemplate = createElementByHTML(TICK_TEMPLATE);

export class Tumbler extends Elm {
  // state
  #wheelReverse = false;
  #suffix = null;
  #fixed = 2;
  #percentBase = null;

  #min = 0;
  #max = 100;
  #step = 1;

  #pixelsPerStep = 20;
  #wheelPixelsPerStep = 30;

  // state(read-write)
  #value = 0;

  // position
  #position = 0;
  #currentIndex = -1;

  // wheel
  #wheelEndTimer = null;

  // element
  #mainEl = null;
  #rulerEl = null;
  #labelEls = [];

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "tumbler",
    });

    this.#init();
    this.#render();
    this.#bindEvents();
    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("wheelReverse", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#wheelReverse = value;
    });

    this.resolveOption("suffix", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#suffix = value;
    });

    this.resolveOption("fixed", (value, assertionSubject) => {
      assertNonNegativeInteger(value, assertionSubject);
      this.#fixed = value;
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

    this.resolveOption("step", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#step = value;
    });

    this.resolveOption("pixelsPerStep", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerStep = value;
    });

    this.resolveOption("wheelPixelsPerStep", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#wheelPixelsPerStep = value;
    });

    if (this.#max <= this.#min) {
      throw new Error("max must be greater than min");
    }

    this.resolveOption("value", (value, assertionSubject) => {
      assertNumber(value, assertionSubject);
      this.#value = this.#snapValue(value);
    });

    this.#value = this.#snapValue(this.#value);
    this.#position = this.#resolvePosition(this.#value);
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

  get pixelsPerStep() {
    return this.#pixelsPerStep;
  }

  get wheelPixelsPerStep() {
    return this.#wheelPixelsPerStep;
  }

  get ratio() {
    return this.#resolveRatio(this.#value);
  }

  get progress() {
    return this.#resolveProgress(this.#value);
  }

  get percent() {
    return this.#resolvePercent(this.#value);
  }

  get tickCount() {
    return this.#getTickCount();
  }

  get rulerHeight() {
    return this.#getRulerHeight();
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  set value(value) {
    assertNumber(value, "value");

    const newValue = this.#snapValue(value);

    if (newValue === this.#value) {
      return;
    }

    this.#value = newValue;
    this.#position = this.#resolvePosition(newValue);

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
      this.#updateRulerPosition();
    };

    this.event.on(this.#mainEl, "wheel", this.#wheelHandler, {
      passive: false,
    });
  }

  #wheelHandler = (event) => {
    event.preventDefault();

    if (event.deltaY === 0) {
      return;
    }

    let deltaY = event.deltaY;

    if (this.#wheelReverse) {
      deltaY = -deltaY;
    }

    this.#position -= deltaY / this.#wheelPixelsPerStep;
    this.#position = this.#clampPosition(this.#position);

    this.#updateRulerPosition();
    this.#updateValueByPosition();

    clearTimeout(this.#wheelEndTimer);

    this.#wheelEndTimer = setTimeout(() => {
      this.#snapPosition();
    }, 80);
  };

  // -----------------------------------------------------------------------------
  // position
  // -----------------------------------------------------------------------------

  #resolvePosition(value) {
    return (value - this.#min) / this.#step;
  }

  #clampPosition(position) {
    return Math.min(Math.max(position, 0), this.#getTickCount() - 1);
  }

  #updateValueByPosition() {
    const index = Math.round(this.#position);
    const value = this.#resolveTickValue(index);

    this.#updateCurrentLabel(index);

    if (value === this.#value) {
      return;
    }

    this.#value = value;
    this.#emitChange(this.#value);
  }

  #snapPosition() {
    const index = Math.round(this.#position);

    this.#position = index;
    this.#value = this.#resolveTickValue(index);

    this.#rulerEl.classList.add("is-snapping");
    this.#updateRulerPosition();

    this.#rulerEl.addEventListener(
      "transitionend",
      () => {
        this.#rulerEl.classList.remove("is-snapping");
      },
      { once: true },
    );
  }

  #updateRulerPosition() {
    const mainHeight = this.#mainEl.clientHeight;

    const y = this.#position * this.#pixelsPerStep;

    const translateY = mainHeight / 2 - y;

    this.#rulerEl.style.transform = `translateY(${translateY}px)`;
  }

  // -----------------------------------------------------------------------------
  // ruler
  // -----------------------------------------------------------------------------

  #getTickCount() {
    return Math.floor((this.#max - this.#min) / this.#step + 1e-10) + 1;
  }

  #getRulerHeight() {
    return (this.#getTickCount() - 1) * this.#pixelsPerStep;
  }

  #renderRuler() {
    this.#rulerEl.style.height = `${this.#getRulerHeight()}px`;

    this.#renderTicks();
  }

  #renderTicks() {
    const tickCount = this.#getTickCount();

    for (let index = 0; index < tickCount; index++) {
      const value = this.#resolveTickValue(index);
      const tickEl = tickTemplate.cloneNode(true);

      const labelEl = getBySelector(tickEl, ".tumbler-label");

      const y = index * this.#pixelsPerStep;

      tickEl.style.top = `${y}px`;
      labelEl.textContent = this.#formatValue(value);

      this.#labelEls.push(labelEl);
      this.#rulerEl.append(tickEl);
    }
  }

  // -----------------------------------------------------------------------------
  // value
  // -----------------------------------------------------------------------------

  #clampValue(value) {
    return Math.min(Math.max(value, this.#min), this.#max);
  }

  #snapValue(value) {
    const clampedValue = this.#clampValue(value);

    const index = Math.round((clampedValue - this.#min) / this.#step);

    return this.#resolveTickValue(index);
  }

  #resolveTickValue(index) {
    return Number((this.#min + index * this.#step).toFixed(12));
  }

  #resolveRatio(value) {
    return (value - this.#min) / (this.#max - this.#min);
  }

  #resolveProgress(value) {
    return Number((this.#resolveRatio(value) * 100).toFixed(this.#fixed));
  }

  #resolvePercent(value) {
    if (this.#percentBase == null) {
      return this.#resolveProgress(value);
    }

    return Number(((value / this.#percentBase) * 100).toFixed(this.#fixed));
  }

  #formatValue(value) {
    const suffix = this.#suffix ?? "";

    if (suffix === "%") {
      return `${this.#resolvePercent(value)}%`;
    }

    return `${value}${suffix}`;
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    const index = Math.round(this.#position);

    this.#updateRulerPosition();
    this.#updateCurrentLabel(index);
  }

  #updateCurrentLabel(index) {
    if (index === this.#currentIndex) {
      return;
    }

    this.#labelEls[this.#currentIndex]?.classList.remove("is-current");
    this.#labelEls[index]?.classList.add("is-current");

    this.#currentIndex = index;
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const mainEl = mainTemplate.cloneNode(true);

    const rulerEl = getBySelector(mainEl, ".tumbler-ruler");

    this.#mainEl = mainEl;
    this.#rulerEl = rulerEl;

    this.#renderRuler();

    this.rootElement.append(mainEl);
  }
}
