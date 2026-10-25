import { Elm } from "../base/elm.js";
import {
  assertPositive,
  assertNonNegative,
  assertHtmlElement,
  assertNumber,
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
  #timelineInfo = null;
  // state(read-write)
  #pixelsPerSecond = 0;
  #duration = 0;

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

    this.#initTimelineInfo();

    this.#width = this.#calculateWidth();
  }

  #initTimelineInfo() {
    const timelineViewportEl = this.rootElement.closest(
      "[data-role='timeline-viewport']",
    );
    assertHtmlElement(timelineViewportEl, "timeline viewport");

    const timelineCanvasEl = this.rootElement.closest(
      "[data-role='timeline-canvas']",
    );
    assertHtmlElement(timelineCanvasEl, "timeline canvas");

    const viewportStyle = getComputedStyle(timelineViewportEl);
    const canvasStyle = getComputedStyle(timelineCanvasEl);

    this.#timelineInfo = {
      timelineViewport: {
        element: timelineViewportEl,
        margin: {
          top: parseFloat(viewportStyle.marginTop),
          right: parseFloat(viewportStyle.marginRight),
          bottom: parseFloat(viewportStyle.marginBottom),
          left: parseFloat(viewportStyle.marginLeft),
        },
        border: {
          topWidth: parseFloat(viewportStyle.borderTopWidth),
          rightWidth: parseFloat(viewportStyle.borderRightWidth),
          bottomWidth: parseFloat(viewportStyle.borderBottomWidth),
          leftWidth: parseFloat(viewportStyle.borderLeftWidth),
        },
        padding: {
          top: parseFloat(viewportStyle.paddingTop),
          right: parseFloat(viewportStyle.paddingRight),
          bottom: parseFloat(viewportStyle.paddingBottom),
          left: parseFloat(viewportStyle.paddingLeft),
        },
      },
      timelineCanvas: {
        element: timelineCanvasEl,
        margin: {
          top: parseFloat(canvasStyle.marginTop),
          right: parseFloat(canvasStyle.marginRight),
          bottom: parseFloat(canvasStyle.marginBottom),
          left: parseFloat(canvasStyle.marginLeft),
        },
        border: {
          topWidth: parseFloat(canvasStyle.borderTopWidth),
          rightWidth: parseFloat(canvasStyle.borderRightWidth),
          bottomWidth: parseFloat(canvasStyle.borderBottomWidth),
          leftWidth: parseFloat(canvasStyle.borderLeftWidth),
        },
        padding: {
          top: parseFloat(canvasStyle.paddingTop),
          right: parseFloat(canvasStyle.paddingRight),
          bottom: parseFloat(canvasStyle.paddingBottom),
          left: parseFloat(canvasStyle.paddingLeft),
        },
      },
    };
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

  get timelineViewport() {
    const viewport = this.#timelineInfo.timelineViewport;

    return {
      ...viewport,
      margin: { ...viewport.margin },
      border: { ...viewport.border },
      padding: { ...viewport.padding },
    };
  }

  get timelineCanvas() {
    const canvas = this.#timelineInfo.timelineCanvas;

    return {
      ...canvas,
      margin: { ...canvas.margin },
      border: { ...canvas.border },
      padding: { ...canvas.padding },
    };
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

    const viewport = this.#timelineInfo.timelineViewport;
    const canvas = this.#timelineInfo.timelineCanvas;

    const availableRulerWidth =
      viewport.element.clientWidth -
      viewport.padding.left -
      viewport.padding.right -
      canvas.margin.left -
      canvas.margin.right -
      canvas.border.leftWidth -
      canvas.border.rightWidth -
      canvas.padding.left -
      canvas.padding.right;

    return Number(
      Math.max(durationWidth + trailingWidth, availableRulerWidth).toFixed(2),
    );
  }

  // -----------------------------------------------------------------------------
  // time and position conversion
  // -----------------------------------------------------------------------------

  timeToPixels(seconds) {
    assertNonNegative(seconds, "seconds");
    return Number((seconds * this.#pixelsPerSecond).toFixed(2));
  }

  pixelsToTime(pixels) {
    assertNumber(pixels, "pixels");
    pixels = pixels < 0 ? 0 : pixels;
    return Number((pixels / this.#pixelsPerSecond).toFixed(3));
  }

  timeToLeft(seconds) {
    assertNonNegative(seconds, "seconds");

    seconds = Math.min(Math.max(seconds, 0), this.seconds);

    const pixels = this.timeToPixels(seconds);
    const canvas = this.#timelineInfo.timelineCanvas;
    return canvas.padding.left + pixels;
  }

  leftToTime(left) {
    assertNumber(left, "left");

    const canvas = this.#timelineInfo.timelineCanvas;
    left = this.#normalizeLeftInTimelineCanvas(left);

    const pixels = left - canvas.padding.left;
    return this.pixelsToTime(pixels);
  }

  clientXToPosition(clientX) {
    assertNumber(clientX, "clientX");

    const canvas = this.#timelineInfo.timelineCanvas;
    let left = clientX - canvas.element.getBoundingClientRect().left;
    left = this.#normalizeLeftInTimelineCanvas(left);

    const time = this.leftToTime(left);
    return { left, time };
  }

  #normalizeLeftInTimelineCanvas(left) {
    assertNumber(left, "left");

    const canvas = this.#timelineInfo.timelineCanvas;
    const clientWidth = canvas.element.clientWidth;

    if (left < canvas.padding.left) {
      left = canvas.padding.left;
    }

    if (left > clientWidth - canvas.padding.right) {
      left = clientWidth - canvas.padding.right;
    }

    return left;
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
      duration: this.duration,
      pixelsPerSecond: this.pixelsPerSecond,
      width: this.width,
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

    const intervalPixels = intervalSeconds * this.#pixelsPerSecond;

    return {
      intervalSeconds: Number(intervalSeconds.toFixed(3)),
      intervalPixels: Number(intervalPixels.toFixed(2)),
    };
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    on(this.timelineViewport.element, "resizeElement", () => {
      const newWidth = this.#calculateWidth();
      if (newWidth !== this.#width) {
        this.#width = newWidth;
        this.#render();
        this.#emitWidthChange();
      }
    });
  }
}
