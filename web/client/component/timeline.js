import { Elm } from "./elm.js";
import {
  createElementByHTML,
  dispatchEvent,
  assertTime,
  assertNumber,
  assertInteger,
} from "./elm-helper.js";

const DEFAULT_HEADER_HTML = `<div class="timeline-header" data-role="timeline-header"></div>`;
const DEFAULT_BODY_HTML = `<div class="timeline-body" data-role="timeline-body"></div>`;
const DEFAULT_RULER_HTML = `<div class="timeline-ruler" data-role="timeline-ruler"></div>`;
const DEFAULT_TRUCK_HTML = `<div class="timeline-truck" data-role="timeline-truck"></div>`;

export class Timeline extends Elm {
  #baseZoom = 100;
  #minZoom = 10;
  #maxZoom = 500;

  #basePixelsPerSecond = 50;
  #minPixelsPerSecond = 10;
  #maxPixelsPerSecond = 500;

  #duration = 0;
  #pixelsPerSecond = this.#basePixelsPerSecond;

  #scrollHandler;

  constructor(root, options = {}) {
    const rootClass = options.rootClass ?? "timeline";

    const dataset = options.dataset ?? {};
    if (options.name != null) {
      dataset.name = options.name;
    }

    super(root, {
      ...options,

      rootClass,
      dataset,
    });

    if (options.duration != null) {
      this.duration = options.duration;
    }

    if (options.zoom != null) {
      this.zoom = options.zoom;
    } else if (options.pixelsPerSecond != null) {
      this.pixelsPerSecond = options.pixelsPerSecond;
    }

    this.render();
  }

  /** duration in seconds */
  get duration() {
    return this.#duration;
  }
  set duration(seconds) {
    assertTime(seconds, "duration");

    this.#duration = seconds;
    this.render();
  }

  /** pixels per second */
  get pixelsPerSecond() {
    return this.#pixelsPerSecond;
  }
  set pixelsPerSecond(value) {
    assertNumber(value, "pixelsPerSecond");

    const pixelsPerSecond = Math.min(
      Math.max(value, this.#minPixelsPerSecond),
      this.#maxPixelsPerSecond,
    );
    this.#pixelsPerSecond = pixelsPerSecond;

    this.render();
  }

  /** zoom level in percent */
  get zoom() {
    return Math.round(
      (this.#pixelsPerSecond * this.#baseZoom) / this.#basePixelsPerSecond,
    );
  }
  set zoom(value) {
    assertInteger(value, "zoom");

    const zoom = Math.min(Math.max(value, this.#minZoom), this.#maxZoom);
    this.#pixelsPerSecond = Number(
      ((zoom * this.#basePixelsPerSecond) / this.#baseZoom).toFixed(2),
    );

    this.render();
  }

  /** width in pixels */
  get width() {
    return this.#duration * this.#pixelsPerSecond;
  }

  timeToX(seconds) {
    assertTime(seconds, "seconds");

    return seconds * this.#pixelsPerSecond;
  }

  xToTime(x) {
    assertNumber(x, "x");

    return x / this.#pixelsPerSecond;
  }

  toJSON() {
    return {
      duration: this.#duration,
    };
  }

  render() {
    this.rootElement.style.width = `${this.width}px`;

    let headerElement, bodyElement, rulerElement,truckElement;

    if (!this.root.has("__header__")) {
      headerElement = createElementByHTML(DEFAULT_HEADER_HTML);
      this.root.add("__header__", headerElement);

      bodyElement = createElementByHTML(DEFAULT_BODY_HTML);
      this.root.add("__body__", bodyElement);

      rulerElement = createElementByHTML(DEFAULT_RULER_HTML);
      this.root.add("__ruler__", rulerElement, "__header__");
      rulerElement.textContent = "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890"

      truckElement = createElementByHTML(DEFAULT_TRUCK_HTML);
      this.root.add("truck1", truckElement, "__body__");
      truckElement.textContent = "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890"


      bodyElement.addEventListener("scroll", () => {
        headerElement.style.transform = `translateX(-${bodyElement.scrollLeft}px)`;
      });
    }

    rulerElement = rulerElement ?? this.root.get("__ruler__");
    rulerElement.style.width = `${this.width}px`;
    truckElement = truckElement ?? this.root.get("truck1");
    truckElement.style.width = `${this.width}px`;
  }
}
