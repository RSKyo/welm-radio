import { Elm } from "../base/elm.js";
import { assertNonNegative, assertPositive } from "../base/assert.js";

export class TimelineCursor extends Elm {
  // state(read-write)
  #pixelsPerSecond = 50;
  #time = 0;
  // ui
  #containerEl = null;
  #marginLeft = 0;
  #marginRight = 0;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "timeline-cursor",
    });

    this.#init();
    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });

    this.resolveOption("time", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#time = value;
    });

    this.resolveOption("marginLeft", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#marginLeft = value;
    });

    this.resolveOption("marginRight", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#marginRight = value;
    });

    const containerEl = this.rootElement.parentElement;
    if (!containerEl) {
      throw new Error("Container element not found");
    }
    this.#containerEl = containerEl;
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get left() {
    return Number((this.#marginLeft + this.#time * this.#pixelsPerSecond).toFixed(2));
  }

  get #offsetTime() {
    return this.#marginLeft / this.#pixelsPerSecond;
  }

  get #maxTime() {
    return (
      (this.#containerEl.clientWidth - this.#marginLeft - this.#marginRight) /
      this.#pixelsPerSecond
    );
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get time() {
    return Number(this.#time.toFixed(3));
  }

  set time(value) {
    assertNonNegative(value, "time");

    let newTime = value - this.#offsetTime;
    newTime = Math.min(Math.max(newTime, 0), this.#maxTime);

    if (newTime === this.#time) {
      return;
    }

    this.#time = newTime;
    this.#updateUIState();

    this.#emitTimeChange();
  }

  get pixelsPerSecond() {
    return this.#pixelsPerSecond;
  }

  set pixelsPerSecond(value) {
    assertPositive(value, "pixelsPerSecond");

    if (value === this.#pixelsPerSecond) {
      return;
    }

    this.#pixelsPerSecond = value;
    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onTimeChange(handler) {
    this.handler.set("timeChangeHandler", handler);
  }

  #emitTimeChange() {
    this.handler.emit("timeChangeHandler", {
      elm: this,
      time: this.time,
      left: this.left,
    });
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    this.rootElement.style.left = `${this.left}px`;
  }
}
