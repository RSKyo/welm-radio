import { Elm } from "./base/elm.js";
import {
  assertInteger,
  isNullishOrEmpty,
  assertBoolean,
  assertNonBlankString,
  assertFunction,
  assertPositiveInteger,
  assertValueIn,
  assertPositive,
} from "./base/assert.js";

const ROOT_CLASS = "timeline";
const BASE_ZOOM = 100;
const MIN_ZOOM = 10;
const MAX_ZOOM = 500;
const BASE_PIXELS_PER_SECOND = 50;
const MIN_PIXELS_PER_SECOND = (BASE_PIXELS_PER_SECOND * MIN_ZOOM) / BASE_ZOOM;
const MAX_PIXELS_PER_SECOND = (BASE_PIXELS_PER_SECOND * MAX_ZOOM) / BASE_ZOOM;

const HEADER_HTML = `
<div class="timeline-header"></div>
`;
const BODY_HTML = `
<div class="timeline-body"></div>
`;
const RULER_HTML = `
<div class="timeline-ruler" data-role="timeline-ruler"></div>
`;

export class Timeline extends Elm {
  // state
  #duration = 0;
  #pixelsPerSecond = BASE_PIXELS_PER_SECOND;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });
    this.#init(options);
  }

  init(root, options = {}) {
    super.init(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });
    this.#init(options);
  }

  #init(options = {}) {
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
    assertTime(seconds, "duration");

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
    return this.#duration * this.#pixelsPerSecond;
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

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    if (this.dom == null) {
      return;
    }
    this.dom.clear();

    const headerElement = this.createElementByHTML(HEADER_HTML);
    const bodyElement = this.createElementByHTML(BODY_HTML);
    const rulerElement = this.createElementByHTML(RULER_HTML);

    this.dom.add("header", headerElement);
    this.dom.add("body", bodyElement);
    this.dom.add("ruler", rulerElement, "header");
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    if (this.dom == null) {
      return;
    }

    const headerElement = this.dom.get("header");
    const bodyElement = this.dom.get("body");

    bodyElement.addEventListener("scroll", () => {
      headerElement.style.transform = `translateX(-${bodyElement.scrollLeft}px)`;
    });
  }
}
