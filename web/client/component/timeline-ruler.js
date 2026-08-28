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
const INTERVALS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5,
  10,
];

const ROOT_CLASS = "timeline-ruler";
const BASE_ZOOM = 100;
const MIN_ZOOM = 20;
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
  // state
  #duration = 0;
  #pixelsPerSecond = BASE_PIXELS_PER_SECOND;
  #resizeObserver;
  #trackList;

  constructor(root, options = {}) {
    super(root, {
      rootClass: ROOT_CLASS,
    });

    this.#render();
    this.#bindEvents();
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
    const containerWidth = this.rootElement.parentElement?.clientWidth ?? 0;
    const timelineWidth = this.#duration * this.#pixelsPerSecond;

    return Math.max(containerWidth, timelineWidth);
  }

  /** time to x coordinate conversion */

  timeToX(seconds) {
    assertTime(seconds, "seconds");

    return seconds * this.#pixelsPerSecond;
  }

  /** x coordinate to time conversion */

  xToTime(x) {
    assertNumber(x, "x");

    return x / this.#pixelsPerSecond;
  }

  #getRulerInterval() {
    let intervalSeconds = INTERVALS[0];
    let intervalPixels = intervalSeconds * this.#pixelsPerSecond;
    let minDiff = Math.abs(intervalPixels - PIXELS_PER_INTERVAL);

    for (const seconds of INTERVALS.slice(1)) {
      const pixels = seconds * this.#pixelsPerSecond;
      const diff = Math.abs(pixels - PIXELS_PER_INTERVAL);

      if (diff < minDiff) {
        intervalSeconds = seconds;
        intervalPixels = pixels;
        minDiff = diff;
      }
    }

    return {
      intervalSeconds,
      intervalPixels,
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

    const width = this.width;
    this.rootElement.style.width = `${width}px`;

    this.#renderTicks();
  }

  #renderTicks() {
    const { intervalSeconds, intervalPixels } = this.#getRulerInterval();

    const width = this.width;
    const tickCount = Math.floor(width / intervalPixels);

    const subdivisionCount = 10;
    const minorIntervalPixels = intervalPixels / subdivisionCount;

    for (let index = 0; index <= tickCount; index++) {
      const seconds = index * intervalSeconds;
      const x = index * intervalPixels;

      // major tick
      const tickElement = this.createElementByHTML(TICK_TEMPLATE);
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

        const minorTickElement = this.createElementByHTML(TICK_TEMPLATE);

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

  #bindEvents() {
    this.#observeResize();
  }

  #unobserveResize() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  #observeResize() {
    const container = this.rootElement.parentElement;

    if (!container) {
      return;
    }

    this.#resizeObserver?.disconnect();

    this.#resizeObserver = new ResizeObserver(() => {
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
