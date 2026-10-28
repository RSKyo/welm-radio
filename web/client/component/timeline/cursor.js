import { Elm } from "../base/elm.js";
import { assertNonNegative } from "../base/assert.js";

export class TimelineCursor extends Elm {
  #timelineRuler = null;
  #time = 0;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "timeline-cursor",
    });

    this.#init();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.applyOption("timelineRuler", (value, assertionSubject) => {
      this.#timelineRuler = value;
    });

    if (this.#timelineRuler == null) {
      throw new Error("Timeline ruler not found");
    }

    this.applyOption("time", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#time = value;
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get time() {
    return Number(this.#time.toFixed(3));
  }

  set time(value) {
    assertNonNegative(value, "time");

    const time = Math.min(Math.max(0, value), this.#timelineRuler.seconds);

    this.#setTime(time);
  }

  #setTime(time) {
    if (time === this.#time) {
      return;
    }

    this.#time = time;

    this.#updateUIState();
    this.#emitTimeChange(time);
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onTimeChange(handler) {
    this.handler.on("timeChangeHandler", handler);
  }

  #emitTimeChange(time) {
    this.handler.emit("timeChangeHandler", {
      elm: this,
      time,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    const timelineCanvasEl = this.#timelineRuler.timelineCanvas.element;
    this.event.on(timelineCanvasEl, "pointermove", this.#pointerMoveHandler);

    this.#timelineRuler.onWidthChange = () => {
      this.time = this.#time;
    };
  }

  #pointerMoveHandler = (event) => {
    const { time } = this.#timelineRuler.clientXToPosition(event.clientX);
    this.time = time;
  };

  // -----------------------------------------------------------------------------
  // ui
  // -----------------------------------------------------------------------------

  #updateUIState() {
    const left = this.#timelineRuler.timeToLeft(this.#time);

    this.rootElement.style.left = `${left}px`;
  }
}
