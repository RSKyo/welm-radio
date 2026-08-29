import { Elm } from "./base/elm.js";
import { TimelineTrackList } from "./timeline-track-list.js";
import {
  assertInteger,
  isHtmlElement,
  assertHtmlElement,
  assertTimeInSeconds,
  assertNumber,
  isNullishOrEmpty,
  assertBoolean,
  assertNonBlankString,
  assertFunction,
  assertPositiveInteger,
  assertValueIn,
  assertPositive,
} from "./base/assert.js";

const PIXELS_PER_INTERVAL = 100;
const MIN_TIME_UNIT = 0.005;

const ROOT_CLASS = "timeline-ruler";
const BASE_ZOOM = 100;
const MIN_ZOOM = 10;
const MAX_ZOOM = 500;
const BASE_PIXELS_PER_SECOND = 50;
const MIN_PIXELS_PER_SECOND = (BASE_PIXELS_PER_SECOND * MIN_ZOOM) / BASE_ZOOM;
const MAX_PIXELS_PER_SECOND = (BASE_PIXELS_PER_SECOND * MAX_ZOOM) / BASE_ZOOM;

const TICK_TEMPLATE = `
<div class="timeline-ruler-tick">
  <div class="timeline-ruler-tick-mark"></div>
  <div class="timeline-ruler-tick-text"></div>
</div>
`;

export class TimelineRuler extends Elm {
  // templates
  #tickTemplate;
  // state
  #duration = 0;
  #pixelsPerSecond = BASE_PIXELS_PER_SECOND;
  #width = 0;
  #resizeObserver;
  #trackList;
  // event
  #onMousemove;

  constructor(root, options = {}) {
    super(root, {
      rootClass: ROOT_CLASS,
    });

    this.#initTickTemplate();
    this.#width = this.#calculateWidth();
    this.#render();
    this.#bindEvents();
  }

  #initTickTemplate(target) {
    this.#tickTemplate = this.createElementByHTML(
      TICK_TEMPLATE,
      "TICK_TEMPLATE",
    );
  }

  // -----------------------------------------------------------------------------
  // state
  // -----------------------------------------------------------------------------

  /** duration in seconds  */

  get duration() {
    return this.#duration;
  }

  set duration(seconds) {
    assertTimeInSeconds(seconds, "duration");

    this.#duration = seconds;
    this.#width = this.#calculateWidth();

    this.#render();
  }

  /** pixels per second */

  get pixelsPerSecond() {
    return this.#pixelsPerSecond;
  }

  set pixelsPerSecond(value) {
    assertPositive(value, "pixelsPerSecond");

    const pixelsPerSecond = Math.min(
      Math.max(value, MIN_PIXELS_PER_SECOND),
      MAX_PIXELS_PER_SECOND,
    );
    this.#pixelsPerSecond = pixelsPerSecond;
    this.#width = this.#calculateWidth();

    this.#render();
  }

  /** zoom level in percent */

  get zoom() {
    return Math.round(
      (this.#pixelsPerSecond * BASE_ZOOM) / BASE_PIXELS_PER_SECOND,
    );
  }

  set zoom(value) {
    assertInteger(value, "zoom");

    const zoom = Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
    this.#pixelsPerSecond = Number(
      ((zoom * BASE_PIXELS_PER_SECOND) / BASE_ZOOM).toFixed(2),
    );

    this.#render();
  }

  /** width in pixels */

  get width() {
    return this.#width;
  }

  #calculateWidth() {
    const containerWidth = this.rootElement.parentElement?.clientWidth ?? 0;
    const timelineWidth = this.#duration * this.#pixelsPerSecond;

    return Math.max(containerWidth, timelineWidth);
  }

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

  #getRulerInterval() {
    let intervalSeconds = PIXELS_PER_INTERVAL / this.#pixelsPerSecond;

    if (intervalSeconds <= MIN_TIME_UNIT) {
      intervalSeconds = MIN_TIME_UNIT;
    } else {
      const remainder = intervalSeconds % MIN_TIME_UNIT;
      if (remainder !== 0) {
        intervalSeconds = intervalSeconds - remainder;
        if (remainder >= MIN_TIME_UNIT / 2) {
          intervalSeconds += MIN_TIME_UNIT;
        }
      }
    }

    let intervalPixels = intervalSeconds * this.#pixelsPerSecond;

    return {
      intervalSeconds: Number(intervalSeconds.toFixed(3)),
      intervalPixels: Number(intervalPixels.toFixed(2)),
    };
  }

  get trackList() {
    return this.#trackList;
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.dom.clear();

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
      const tickElement = this.#tickTemplate.cloneNode(true);
      tickElement.style.left = `${x}px`;
      tickElement.classList.add("is-major");

      const textElement = tickElement.querySelector(
        ".timeline-ruler-tick-text",
      );
      textElement.textContent = formatTime(seconds);

      this.dom.add(`tick${index}`, tickElement);

      // minor ticks
      for (let minorIndex = 1; minorIndex <= subdivisionCount; minorIndex++) {
        const minorX = x + minorIndex * minorIntervalPixels;
        if (minorX > width) {
          break;
        }

        const minorTickElement = this.#tickTemplate.cloneNode(true);

        minorTickElement.style.left = `${minorX}px`;
        if (minorIndex === subdivisionCount / 2) {
          minorTickElement.classList.add("is-middle");
        } else {
          minorTickElement.classList.add("is-minor");
        }

        const minorTextElement = minorTickElement.querySelector(
          ".timeline-ruler-tick-text",
        );

        minorTextElement.remove();

        this.dom.add(`tick${index}-minor${minorIndex}`, minorTickElement);
      }
    }
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  set onMousemove(handler) {
    if (handler != null) {
      assertFunction(handler, "handler");
      this.#onMousemove = handler;
      return;
    }

    this.#onMousemove = null;
  }

  #bindEvents() {
    this.#observeResize();
    this.dom.onRoot("mousemove", (event) => {
      this.#onMousemove?.(event);
    });
  }

  #observeResize() {
    const container = this.rootElement.parentElement;

    if (!container) {
      return;
    }

    this.#resizeObserver?.disconnect();

    this.#resizeObserver = new ResizeObserver(() => {
      this.#width = this.#calculateWidth();
      this.#render();
    });

    this.#resizeObserver.observe(container);
  }
}

function formatTime(seconds) {
  if (seconds < 60) {
    return `${Number(seconds.toFixed(3))}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds - minutes * 60;

  return `${minutes}:${String(Number(remainSeconds.toFixed(3))).padStart(
    2,
    "0",
  )}`;
}
