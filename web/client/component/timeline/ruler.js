import { Elm } from "../base/elm.js";
import { assertPositive, assertNonNegative } from "../base/assert.js";
import { createElementByHTML, formatTime } from "../base/helper.js";

const TICK_TEMPLATE = `
<div class="timeline-ruler-tick">
  <div class="timeline-ruler-tick-mark"></div>
  <div class="timeline-ruler-tick-text"></div>
</div>
`;

const tickTemplate = createElementByHTML(TICK_TEMPLATE);

export class TimelineRuler extends Elm {
  // state(read-only)
  #basePixelsPerInterval = 100;
  #baseTimeUnit = 0.005;
  #baseZoom = 100;
  #minZoom = 10;
  #maxZoom = 500;
  #basePixelsPerSecond = 50;
  #minPixelsPerSecond;
  #maxPixelsPerSecond;
  #width = 0;
  // state(read-write)
  #pixelsPerSecond = 0;
  #duration = 0;
  #containerWidth = 0;
  #paddingLeft = 0;
  #paddingRight = 0;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "timeline-ruler",
    });

    this.#init();
    this.#render();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("basePixelsPerInterval", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#basePixelsPerInterval = value;
    });

    this.resolveOption("baseTimeUnit", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#baseTimeUnit = value;
    });

    this.resolveOption("baseZoom", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#baseZoom = value;
    });

    this.resolveOption("minZoom", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#minZoom = value;
    });

    this.resolveOption("maxZoom", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#maxZoom = value;
    });

    this.resolveOption("basePixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#basePixelsPerSecond = value;
    });

    this.#minPixelsPerSecond =
      (this.#basePixelsPerSecond * this.#minZoom) / this.#baseZoom;
    this.#maxPixelsPerSecond =
      (this.#basePixelsPerSecond * this.#maxZoom) / this.#baseZoom;

    this.#pixelsPerSecond = this.#basePixelsPerSecond;

    this.resolveOption("containerWidth", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#containerWidth = value;
    });

    this.resolveOption("paddingLeft", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#paddingLeft = value;
    });

    this.resolveOption("paddingRight", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#paddingRight = value;
    });

    this.#width = this.#calculateWidth();
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get width() {
    return this.#width;
  }

  get scaleWidth() {
    return Math.max(this.#width - this.#paddingLeft - this.#paddingRight, 0);
  }

  get seconds() {
    return Number((this.scaleWidth / this.#pixelsPerSecond).toFixed(3));
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  /** pixels per second */

  get pixelsPerSecond() {
    return this.#pixelsPerSecond;
  }

  set pixelsPerSecond(value) {
    assertPositive(value, "pixelsPerSecond");
    this.#setPixelsPerSecond(value);
  }

  #setPixelsPerSecond(value) {
    const newValue = Math.min(
      Math.max(value, this.#minPixelsPerSecond),
      this.#maxPixelsPerSecond,
    );

    if (newValue === this.#pixelsPerSecond) {
      return;
    }

    this.#pixelsPerSecond = newValue;

    const newWidth = this.#calculateWidth();
    if (newWidth !== this.#width) {
      this.#width = newWidth;
      this.#render();
      this.#emitPixelsPerSecondChange();
      this.#emitWidthChange();
    } else {
      this.#render();
      this.#emitPixelsPerSecondChange();
    }
  }

  /** duration */

  get duration() {
    return Number(this.#duration.toFixed(3));
  }

  set duration(value) {
    assertNonNegative(value, "duration");
    this.#setDuration(value);
  }

  #setDuration(value) {
    if (value === this.#duration) {
      return;
    }

    this.#duration = value;

    const newWidth = this.#calculateWidth();
    if (newWidth !== this.#width) {
      this.#width = newWidth;
      this.#render();
      this.#emitDurationChange();
      this.#emitWidthChange();
    } else {
      this.#emitDurationChange();
    }
  }

  /** container width */

  get containerWidth() {
    return this.#containerWidth;
  }

  set containerWidth(value) {
    assertNonNegative(value, "containerWidth");

    if (value === this.#containerWidth) {
      return;
    }

    this.#containerWidth = value;

    const newWidth = this.#calculateWidth();
    if (newWidth !== this.#width) {
      this.#width = newWidth;
      this.#render();
      this.#emitWidthChange();
    }
  }

  #calculateWidth() {
    const durationScaleWidth = this.#duration * this.#pixelsPerSecond;
    const rulerWidth =
      durationScaleWidth + this.#paddingLeft + this.#paddingRight;
    return Number(Math.max(rulerWidth, this.#containerWidth).toFixed(2));
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onPixelsPerSecondChange(handler) {
    this.handler.set("pixelsPerSecondChangeHandler", handler);
  }

  #emitPixelsPerSecondChange() {
    this.handler.emit("pixelsPerSecondChangeHandler", this.#getEventObject());
  }

  set onDurationChange(handler) {
    this.handler.set("durationChangeHandler", handler);
  }

  #emitDurationChange() {
    this.handler.emit("durationChangeHandler", this.#getEventObject());
  }

  set onWidthChange(handler) {
    this.handler.set("widthChangeHandler", handler);
  }

  #emitWidthChange() {
    this.handler.emit("widthChangeHandler", this.#getEventObject());
  }

  #getEventObject() {
    return {
      elm: this,
      duration: this.#duration,
      pixelsPerSecond: this.#pixelsPerSecond,
      width: this.#width,
      scaleWidth: this.scaleWidth,
      seconds: this.seconds,
    };
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.rootElement.replaceChildren();
    this.rootElement.style.width = `${this.#width}px`;

    this.#renderTicks(this.scaleWidth);
  }

  #renderTicks(scaleWidth) {
    const { intervalSeconds, intervalPixels } = this.#getRulerInterval();

    const tickCount = Math.floor(scaleWidth / intervalPixels);

    const subdivisionCount = 10;
    const minorIntervalPixels = intervalPixels / subdivisionCount;

    for (let index = 0; index <= tickCount; index++) {
      const seconds = index * intervalSeconds;
      const x = index * intervalPixels;

      // major tick
      const tickEl = tickTemplate.cloneNode(true);

      tickEl.style.left = `${this.#paddingLeft + x}px`;
      tickEl.classList.add("is-major");

      const textElement = tickEl.querySelector(".timeline-ruler-tick-text");
      textElement.textContent = formatTime(seconds);

      this.rootElement.append(tickEl);

      // minor ticks
      for (let minorIndex = 1; minorIndex < subdivisionCount; minorIndex++) {
        const minorX = x + minorIndex * minorIntervalPixels;

        if (minorX > scaleWidth) {
          break;
        }

        const minorTickEl = tickTemplate.cloneNode(true);

        minorTickEl.style.left = `${this.#paddingLeft + minorX}px`;

        if (minorIndex === subdivisionCount / 2) {
          minorTickEl.classList.add("is-middle");
        } else {
          minorTickEl.classList.add("is-minor");
        }

        const minorTextElement = minorTickEl.querySelector(
          ".timeline-ruler-tick-text",
        );

        minorTextElement.remove();

        this.rootElement.append(minorTickEl);
      }
    }
  }

  #getRulerInterval() {
    let intervalSeconds = this.#basePixelsPerInterval / this.#pixelsPerSecond;

    if (intervalSeconds <= this.#baseTimeUnit) {
      intervalSeconds = this.#baseTimeUnit;
    } else {
      const remainder = intervalSeconds % this.#baseTimeUnit;
      if (remainder !== 0) {
        intervalSeconds = intervalSeconds - remainder;
        if (remainder >= this.#baseTimeUnit / 2) {
          intervalSeconds += this.#baseTimeUnit;
        }
      }
    }

    let intervalPixels = intervalSeconds * this.#pixelsPerSecond;

    return {
      intervalSeconds: Number(intervalSeconds.toFixed(3)),
      intervalPixels: Number(intervalPixels.toFixed(2)),
    };
  }
}
