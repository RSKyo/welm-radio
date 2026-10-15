import {
  assertBoolean,
  assertNumber,
  assertNonBlankString,
  assertNonNegativeInteger,
  assertPositive,
} from "./base/assert.js";
import {
  createElementByHTML,
  getBySelector,
  clampValue,
} from "./base/helper.js";
import { Elm } from "./base/elm.js";

const RANGE_TRACK_TEMPLATE = `
<div class="range-track">
  <div class="range-fill"></div>
  <div class="range-thumb"></div>
  <div class="range-text"></div>
</div>
`;

const rangeTrackTemplate = createElementByHTML(RANGE_TRACK_TEMPLATE);

export class Range extends Elm {
  // state
  #fixed = 2;
  #min = 0;
  #max = 100;
  #step = 1;
  #value = 0;
  #percentBase = null;
  #suffix = null;
  #disabled = false;
  // element
  #rangeTrackEl = null;
  #rangeFillEl = null;
  #rangeThumbEl = null;
  #rangeTextEl = null;
  // ui
  #showThumb = false;
  #showText = false;
  #draggingPointerId = null;
  #thumbDraggingOffsetX = 0;
  #draggingOriginValue = null;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "range",
    });

    this.#init();
    this.#render();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("fixed", (value, assertionSubject) => {
      assertNonNegativeInteger(value, assertionSubject);
      this.#fixed = value;
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

    this.resolveOption("value", (value, assertionSubject) => {
      assertNumber(value, assertionSubject);
      this.#value = value;
    });

    if (this.#max <= this.#min) {
      throw new Error("max must be greater than min");
    }

    this.#value = clampValue(this.#value, this.#min, this.#max, {
      fixed: this.#fixed,
    });

    this.resolveOption("percentBase", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#percentBase = value;
    });

    this.resolveOption("suffix", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#suffix = value;
    });

    this.resolveOption("disabled", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#disabled = value;
    });

    this.resolveOption("showThumb", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#showThumb = value;
    });

    this.resolveOption("showText", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#showText = value;
    });

    this.resolveOption("color", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.rootElement.style.setProperty("--color-range", value);
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get percent() {
    const percent =
      this.#percentBase == null
        ? this.#progress
        : (this.#value / this.#percentBase) * 100;

    return Number(percent.toFixed(this.#fixed));
  }

  get #ratio() {
    return (this.#value - this.#min) / (this.#max - this.#min);
  }

  get #progress() {
    return this.#ratio * 100;
  }

  get isDragging() {
    return this.#draggingPointerId != null;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  /* min (read-write) */

  get min() {
    return this.#min;
  }

  set min(value) {
    this.setMin(value);
  }

  setMin(value, { updateUI = true } = {}) {
    assertNumber(value, "min");

    if (value >= this.#max) {
      throw new Error("min must be less than max");
    }

    if (value === this.#min) {
      return;
    }

    this.#min = value;

    this.#value = clampValue(this.#value, this.#min, this.#max, {
      fixed: this.#fixed,
    });

    if (updateUI) {
      this.#updateUIState();
    }
  }

  /* max (read-write) */

  get max() {
    return this.#max;
  }

  set max(value) {
    this.setMax(value);
  }

  setMax(value, { updateUI = true } = {}) {
    assertNumber(value, "max");

    if (value <= this.#min) {
      throw new Error("max must be greater than min");
    }

    if (value === this.#max) {
      return;
    }

    this.#max = value;

    this.#value = clampValue(this.#value, this.#min, this.#max, {
      fixed: this.#fixed,
    });

    if (updateUI) {
      this.#updateUIState();
    }
  }

  /* step (read-write) */

  get step() {
    return this.#step;
  }

  set step(value) {
    this.setStep(value);
  }

  setStep(value, { updateUI = true } = {}) {
    assertPositive(value, "step");

    if (value <= 0) {
      throw new Error("step must be greater than 0");
    }

    if (value === this.#step) {
      return;
    }

    this.#step = value;

    if (updateUI) {
      this.#updateUIState();
    }
  }

  /* value (read-write) */

  get value() {
    return this.#value;
  }

  set value(value) {
    this.setValue(value, { emitEvent: true });
  }

  setValue(value, { updateUI = true, emitEvent = false } = {}) {
    assertNumber(value, "value");

    const newValue = clampValue(value, this.#min, this.#max, {
      fixed: this.#fixed,
    });

    if (newValue === this.#value) {
      return;
    }

    this.#value = newValue;

    if (updateUI) {
      this.#updateUIState();
    }

    if (emitEvent) {
      this.#emitChange(this.#value);
    }
  }

  /* disabled (read-write) */

  get disabled() {
    return this.#disabled;
  }

  set disabled(value) {
    this.setDisabled(value);
  }

  setDisabled(value, { updateUI = true } = {}) {
    assertBoolean(value, "disabled");

    if (value === this.#disabled) {
      return;
    }

    this.#disabled = value;

    if (updateUI) {
      this.#updateDisabledUIState();
    }
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

  set onEndChange(handler) {
    this.handler.set("endChangeHandler", handler);
  }

  #emitEndChange(value) {
    this.handler.emit("endChangeHandler", {
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

    this.event.on(
      this.#rangeTrackEl,
      "pointerdown",
      this.#rangeTrackPointerDownHandler,
    );

    this.event.on(
      this.#rangeTrackEl,
      "pointermove",
      this.#rangeTrackPointerMoveHandler,
    );

    this.event.on(this.#rangeTrackEl, "pointerup", (event) => {
      this.#endDragging(this.#rangeTrackEl, event.pointerId);
    });

    this.event.on(this.#rangeTrackEl, "pointercancel", (event) => {
      this.#endDragging(this.#rangeTrackEl, event.pointerId);
    });

    if (this.#showThumb) {
      this.event.on(
        this.#rangeThumbEl,
        "pointerdown",
        this.#rangeThumbPointerDownHandler,
      );

      this.event.on(
        this.#rangeThumbEl,
        "pointermove",
        this.#rangeThumbPointerMoveHandler,
      );

      this.event.on(this.#rangeThumbEl, "pointerup", (event) => {
        this.#endDragging(this.#rangeThumbEl, event.pointerId);
      });

      this.event.on(this.#rangeThumbEl, "pointercancel", (event) => {
        this.#endDragging(this.#rangeThumbEl, event.pointerId);
      });
    }
  }

  #rangeTrackPointerDownHandler = (event) => {
    if (this.#disabled) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (this.#draggingPointerId != null) {
      return;
    }

    event.preventDefault();

    this.#rangeTrackEl.setPointerCapture(event.pointerId);
    this.#draggingPointerId = event.pointerId;
    this.#draggingOriginValue = this.#value;

    const rect = this.#rangeTrackEl.getBoundingClientRect();
    const x = event.clientX - rect.left;

    this.#setValueByX(x);
  };

  #rangeTrackPointerMoveHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    if (event.buttons === 0) {
      this.#endDragging(this.#rangeTrackEl, this.#draggingPointerId);
      return;
    }

    const rect = this.#rangeTrackEl.getBoundingClientRect();
    const x = event.clientX - rect.left;

    this.#setValueByX(x);
  };

  #rangeThumbPointerDownHandler = (event) => {
    if (this.#disabled) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (this.#draggingPointerId != null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.#rangeThumbEl.setPointerCapture(event.pointerId);
    this.#draggingPointerId = event.pointerId;
    this.#draggingOriginValue = this.#value;

    const thumbRect = this.#rangeThumbEl.getBoundingClientRect();
    const thumbCenterX = thumbRect.left + thumbRect.width / 2;
    this.#thumbDraggingOffsetX = event.clientX - thumbCenterX;
  };

  #rangeThumbPointerMoveHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    if (event.buttons === 0) {
      this.#endDragging(this.#rangeThumbEl, this.#draggingPointerId);
      return;
    }

    const trackRect = this.#rangeTrackEl.getBoundingClientRect();
    const x = event.clientX - trackRect.left - this.#thumbDraggingOffsetX;

    this.#setValueByX(x);
  };

  #endDragging(element, pointerId) {
    if (pointerId !== this.#draggingPointerId) {
      return;
    }

    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }

    this.#draggingPointerId = null;
    this.#thumbDraggingOffsetX = 0;

    const changed = this.#draggingOriginValue !== this.#value;
    this.#draggingOriginValue = null;

    if (changed) {
      this.#emitEndChange(this.#value);
    }
  }

  #setValueByX(x, { emitEvent = true } = {}) {
    const rect = this.#rangeTrackEl.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    const clampedX = clampValue(x, 0, rect.width);
    const ratio = clampedX / rect.width;

    const rawValue = this.#min + ratio * (this.#max - this.#min);

    const stepIndex = Math.round((rawValue - this.#min) / this.#step);

    const snappedValue = this.#min + stepIndex * this.#step;

    const clampedSnappedValue = clampValue(snappedValue, this.#min, this.#max);

    this.setValue(clampedSnappedValue, {
      emitEvent,
    });
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const rangeTrackEl = rangeTrackTemplate.cloneNode(true);
    const [rangeFillEl, rangeThumbEl, rangeTextEl] = getBySelector(
      rangeTrackEl,
      ".range-fill",
      ".range-thumb",
      ".range-text",
    );
    this.#rangeTrackEl = rangeTrackEl;
    this.#rangeFillEl = rangeFillEl;
    this.#rangeThumbEl = rangeThumbEl;
    this.#rangeTextEl = rangeTextEl;

    this.#rangeThumbEl.style.display = this.#showThumb ? "" : "none";
    this.#rangeTextEl.style.display = this.#showText ? "" : "none";

    this.rootElement.appendChild(rangeTrackEl);

    this.#updateUIState();
  }

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateUIState() {
    const progress = this.#progress;

    this.#rangeFillEl.style.width = `${progress}%`;
    this.#rangeThumbEl.style.left = `${progress}%`;

    if (this.#showText) {
      this.#rangeTextEl.textContent = `${this.percent}${this.#suffix ?? ""}`;

      const trackWidth = this.#rangeTrackEl.clientWidth;
      const textWidth = this.#rangeTextEl.offsetWidth;

      const rawLeft = trackWidth * this.#ratio;
      const minLeft = textWidth / 2;
      const maxLeft = trackWidth - textWidth / 2;

      const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);

      this.#rangeTextEl.style.left = `${left}px`;
    }
  }

  #updateDisabledUIState() {
    this.rootElement.classList.toggle("disabled", this.#disabled);
  }
}
