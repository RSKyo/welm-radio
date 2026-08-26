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

const ROOT_CLASS = "timeline";
const BASE_ZOOM = 100;
const MIN_ZOOM = 10;
const MAX_ZOOM = 500;
const BASE_PIXELS_PER_SECOND = 50;
const MIN_PIXELS_PER_SECOND = (BASE_PIXELS_PER_SECOND * MIN_ZOOM) / BASE_ZOOM;
const MAX_PIXELS_PER_SECOND = (BASE_PIXELS_PER_SECOND * MAX_ZOOM) / BASE_ZOOM;

const HEADER_TEMPLATE = `
<div class="timeline-header">
  <div class="timeline-ruler" data-role="timeline-ruler"></div>
</div>
`;
const BODY_TEMPLATE = `
<div class="timeline-body">
  <div class="timeline-track-list" data-role="timeline-track-list"></div>
</div>
`;

export class Timeline extends Elm{
  // state
  #duration = 0;
  #pixelsPerSecond = BASE_PIXELS_PER_SECOND;
  #trackListElm;

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
    this.dom.clear();

    const headerElement= this.createElementByHTML(HEADER_TEMPLATE);
    const bodyElement = this.createElementByHTML(BODY_TEMPLATE);


    const rulerElement = headerElement.querySelector('[data-role="timeline-ruler"]');
    const trackListElement = bodyElement.querySelector('[data-role="timeline-track-list"]');

    this.dom.add("header", headerElement);
    this.dom.add("ruler", rulerElement, "header");
    this.dom.add("body", bodyElement);
    this.dom.add("trackList", trackListElement, "body");

    // this.#trackListElm = new TimelineTrackList(trackListElement);
    // this.#trackListElm.addItem({text:"111",value:"aaa"});
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    const headerElement = this.dom.get("header");
    const bodyElement = this.dom.get("body");

    bodyElement.addEventListener("scroll", () => {
      headerElement.style.transform = `translateX(-${bodyElement.scrollLeft}px)`;
    });
  }
}

