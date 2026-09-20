import { Elm } from "./base/elm.js";
import {
  assertTimeInSeconds,
  assertNumber,
  assertPositive,
  assertNonNegative,
} from "./base/assert.js";
import { createElementByHTML } from "./base/elm-helper.js";

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
  // state(read-write)
  #pixelsPerSecond;
  #duration;
  #width;

  #containerResizeObserver;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "timeline-ruler",
    });

    this.#init();
    this.#render();
    this.#bindEvents();
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
    this.#duration = 0;
    this.#width = this.#calculateWidth();
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get basePixelsPerInterval() {
    return this.#basePixelsPerInterval;
  }

  get baseTimeUnit() {
    return this.#baseTimeUnit;
  }

  get baseZoom() {
    return this.#baseZoom;
  }

  get minZoom() {
    return this.#minZoom;
  }

  get maxZoom() {
    return this.#maxZoom;
  }

  get basePixelsPerSecond() {
    return this.#basePixelsPerSecond;
  }

  get minPixelsPerSecond() {
    return this.#minPixelsPerSecond;
  }

  get maxPixelsPerSecond() {
    return this.#maxPixelsPerSecond;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get pixelsPerSecond() {
    return this.#pixelsPerSecond;
  }

  set pixelsPerSecond(value) {
    assertNonNegative(value, "pixelsPerSecond");
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

  get duration() {
    return this.#duration;
  }

  set duration(value) {
    assertTimeInSeconds(value, "duration");
    this.#setDuration(value);
  }

  #setDuration(value) {
    if (value === this.#duration) {
      return;
    }

    this.#duration = value;

    this.#setWidth();
  }

  get width() {
    return this.#width;
  }

  set width(value) {
    assertNonNegative(value, "width");
    this.#setWidth(value);
  }

  #setWidth(value = 0) {
    const newWidth = this.#calculateWidth(value);

    if (newWidth === this.#width) {
      return;
    }

    this.#width = newWidth;
    this.#render();

    this.#emitWidthChange();
  }

  #calculateWidth(width = 0) {
    const containerWidth = this.rootElement.parentElement?.clientWidth ?? 0;
    const durationWidth = this.#duration * this.#pixelsPerSecond;

    return Number(Math.max(width, containerWidth, durationWidth).toFixed(2));
  }

  // -----------------------------------------------------------------------------
  // time and coordinate conversion
  // -----------------------------------------------------------------------------

  /** time to x coordinate conversion */

  timeToX(seconds) {
    assertTimeInSeconds(seconds, "seconds");

    return Number((seconds * this.#pixelsPerSecond).toFixed(2));
  }

  /** x coordinate to time conversion */

  xToTime(x) {
    assertNumber(x, "x");
    return Number((x / this.#pixelsPerSecond).toFixed(3));
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onPixelsPerSecondChange(handler) {
    this.handler.set("pixelsPerSecondChangeHandler", handler);
  }

  #emitPixelsPerSecondChange() {
    this.handler.emit("pixelsPerSecondChangeHandler", {
      elm: this,
      duration: this.#duration,
      pixelsPerSecond: this.#pixelsPerSecond,
      width: this.#width,
    });
  }

  set onWidthChange(handler) {
    this.handler.set("widthChangeHandler", handler);
  }

  #emitWidthChange() {
    this.handler.emit("widthChangeHandler", {
      elm: this,
      duration: this.#duration,
      pixelsPerSecond: this.#pixelsPerSecond,
      width: this.#width,
    });
  }

  set onMousemove(handler) {
    this.handler.set("mousemoveHandler", handler);
  }

  #emitMousemove(event) {
    const rulerRect = event.currentTarget.getBoundingClientRect();

    let x = event.clientX - rulerRect.left;
    let y = event.clientY - rulerRect.top;
    y = Math.max(y, 0);
    x = Math.max(x, 0);

    const seconds = this.xToTime(x);
    const formatSeconds = formatTime(seconds);

    this.handler.emit("mousemoveHandler", {
      elm: this,
      event,
      x,
      y,
      seconds,
      formatSeconds,
    });
  }

  #bindEvents() {
    if (this.rootElement.parentElement != null) {
      this.event.onResizeObserve(this.rootElement.parentElement, () => {
        this.#setWidth();
      });
    }

    this.event.on(this.rootElement, "mousemove", (event) => {
      this.#emitMousemove(event);
    });
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.rootElement.replaceChildren();
    this.rootElement.style.width = `${this.#width}px`;

    this.#renderTicks(this.#width);
  }

  #renderTicks(width) {
    const { intervalSeconds, intervalPixels } = this.#getRulerInterval();

    const tickCount = Math.floor(width / intervalPixels);

    const subdivisionCount = 10;
    const minorIntervalPixels = intervalPixels / subdivisionCount;

    for (let index = 0; index <= tickCount; index++) {
      const seconds = index * intervalSeconds;
      const x = index * intervalPixels;

      // major tick
      const tickEl = tickTemplate.cloneNode(true);
      tickEl.style.left = `${x}px`;
      tickEl.classList.add("is-major");

      const textElement = tickEl.querySelector(".timeline-ruler-tick-text");
      textElement.textContent = formatTime(seconds);

      this.rootElement.append(tickEl);

      // minor ticks
      for (let minorIndex = 1; minorIndex < subdivisionCount; minorIndex++) {
        const minorX = x + minorIndex * minorIntervalPixels;
        if (minorX > width) {
          break;
        }

        const minorTickEl = tickTemplate.cloneNode(true);

        minorTickEl.style.left = `${minorX}px`;
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

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainSeconds = seconds % 60;

  const secondText = remainSeconds
    .toFixed(3)
    .replace(/\.?0+$/, "")
    .padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${secondText}`;
  }

  return `${minutes}:${secondText}`;
}

function parseTime(timeText) {
  const parts = timeText.split(":").map(Number);

  if (parts.some(Number.isNaN)) {
    throw new Error(`invalid time: ${timeText}`);
  }

  let hours = 0;
  let minutes;
  let seconds;

  if (parts.length === 2) {
    [minutes, seconds] = parts;
  } else if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else {
    throw new Error(`invalid time: ${timeText}`);
  }

  if (
    hours < 0 ||
    minutes < 0 ||
    minutes >= 60 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    throw new Error(`invalid time: ${timeText}`);
  }

  return hours * 3600 + minutes * 60 + seconds;
}