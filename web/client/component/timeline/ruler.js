import { Elm } from "../base/elm.js";
import {
  assertPositive,
  assertNonNegative,
  assertHtmlElement,
} from "../base/assert.js";
import { on, createElementByHTML, formatTime } from "../base/helper.js";

const TRAILING_DURATION = 30;
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
  #minZoom = 100;
  #maxZoom = 1000;
  #basePixelsPerSecond = 5;
  #minPixelsPerSecond;
  #maxPixelsPerSecond;
  #width = 0;
  #tickSeconds = [];
  // state(read-write)
  #pixelsPerSecond = 0;
  #duration = 0;
  // ui
  #timelineViewportEl = null;
  #timelineCanvasEl = null;

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

    this.#timelineViewportEl = this.rootElement.closest(
      "[data-role='timeline-viewport']",
    );
    assertHtmlElement(this.#timelineViewportEl, "timeline viewport");

    this.#timelineCanvasEl = this.rootElement.closest(
      "[data-role='timeline-canvas']",
    );
    assertHtmlElement(this.#timelineCanvasEl, "timeline canvas");

    this.#width = this.#calculateWidth();
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get width() {
    return this.#width;
  }

  get seconds() {
    return Number((this.#width / this.#pixelsPerSecond).toFixed(3));
  }

  get tickSeconds() {
    return [...this.#tickSeconds];
  }

  get snapPoints() {
    return this.#tickSeconds.map((seconds) => ({
      time: seconds,
      type: "tick",
    }));
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

  #calculateWidth() {
    const durationWidth = this.#duration * this.#pixelsPerSecond;
    const trailingWidth = TRAILING_DURATION * this.#pixelsPerSecond;

    const viewportStyle = getComputedStyle(this.#timelineViewportEl);
    const viewportClientWidth = this.#timelineViewportEl.clientWidth;
    const viewportPaddingLeft = parseFloat(viewportStyle.paddingLeft);
    const viewportPaddingRight = parseFloat(viewportStyle.paddingRight);

    const canvasStyle = getComputedStyle(this.#timelineCanvasEl);
    const canvasMarginLeft = parseFloat(canvasStyle.marginLeft);
    const canvasMarginRight = parseFloat(canvasStyle.marginRight);
    const canvasBorderLeft = parseFloat(canvasStyle.borderLeftWidth);
    const canvasBorderRight = parseFloat(canvasStyle.borderRightWidth);
    const canvasPaddingLeft = parseFloat(canvasStyle.paddingLeft);
    const canvasPaddingRight = parseFloat(canvasStyle.paddingRight);

    const availableRulerWidth =
      viewportClientWidth -
      viewportPaddingLeft -
      viewportPaddingRight -
      canvasMarginLeft -
      canvasMarginRight -
      canvasBorderLeft -
      canvasBorderRight -
      canvasPaddingLeft -
      canvasPaddingRight;

    return Number(
      Math.max(durationWidth + trailingWidth, availableRulerWidth).toFixed(2),
    );
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
      seconds: this.seconds,
    };
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
    this.#tickSeconds = [];

    const { intervalSeconds, intervalPixels } = this.#getRulerInterval();

    const tickCount = Math.floor(width / intervalPixels);

    const subdivisionCount = 10;
    const minorIntervalPixels = intervalPixels / subdivisionCount;
    const minorIntervalSeconds = intervalSeconds / subdivisionCount;

    for (let index = 0; index <= tickCount; index++) {
      const seconds = index * intervalSeconds;
      const x = index * intervalPixels;

      // major tick
      const tickEl = tickTemplate.cloneNode(true);

      tickEl.style.left = `${x}px`;
      tickEl.classList.add("is-major");

      const textElement = tickEl.querySelector(".timeline-ruler-tick-text");
      textElement.textContent = formatTime(seconds, { minimumUnit: "minute" });

      this.rootElement.append(tickEl);

      this.#tickSeconds.push(Number(seconds.toFixed(3)));

      // minor ticks
      for (let minorIndex = 1; minorIndex < subdivisionCount; minorIndex++) {
        const minorSeconds = seconds + minorIndex * minorIntervalSeconds;
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

        this.#tickSeconds.push(Number(minorSeconds.toFixed(3)));
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

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    on(this.#timelineViewportEl, "resizeElement", () => {
      const newWidth = this.#calculateWidth();
      if (newWidth !== this.#width) {
        this.#width = newWidth;
        this.#render();
        this.#emitWidthChange();
      }
    });
  }
}
