import { Elm } from "../base/elm.js";
import { assertNonNegative } from "../base/assert.js";

export class TimelinePlayhead extends Elm {
  #timelineRuler = null;

  #time = 0;
  #draggingPointerId = null;

  #handleEl = null;
  #handleElOffsetX = 0;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "timeline-playhead",
    });

    this.#init();
    this.#render();
    this.#bindEvents();
    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("timelineRuler", (value, assertionSubject) => {
      this.#timelineRuler = value;
    });

    this.resolveOption("time", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#time = value;
    });

    if (this.#timelineRuler == null) {
      throw new Error("Timeline ruler not found");
    }
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get time() {
    return Number(this.#time.toFixed(3));
  }

  set time(value) {
    assertNonNegative(value, "time");

    const time = Math.min(value, this.#timelineRuler.seconds);

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
    this.handler.set("timeChangeHandler", handler);
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
    this.event.on(this.#handleEl, "pointerdown", this.#pointerDownHandler);
    window.addEventListener("pointermove", this.#pointerMoveHandler);
    window.addEventListener("pointerup", this.#pointerUpHandler);
    window.addEventListener("pointercancel", this.#pointerCancelHandler);

    const timelineCanvasEl = this.#timelineRuler.timelineCanvas.element;
    this.event.on(
      timelineCanvasEl,
      "dblclick",
      this.#pointerDoubleClickHandler,
    );
  }

  #pointerDownHandler = (event) => {
    if (event.button !== 0) {
      return;
    }

    if (this.#draggingPointerId != null) {
      return;
    }

    const { left } = this.#timelineRuler.clientXToPosition(event.clientX);
    const playheadLeft = this.#timelineRuler.timeToLeft(this.#time);

    this.#handleElOffsetX = left - playheadLeft;
    this.#draggingPointerId = event.pointerId;

    event.preventDefault();
  };

  #pointerMoveHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    const { time } = this.#timelineRuler.clientXToPosition(
      event.clientX - this.#handleElOffsetX,
    );

    this.time = time;
  };

  #pointerUpHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    this.#endDragging();
  };

  #pointerCancelHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    this.#endDragging();
  };

  #endDragging() {
    const pointerId = this.#draggingPointerId;

    this.#draggingPointerId = null;
    this.#handleElOffsetX = 0;
  }

  #pointerDoubleClickHandler = (event) => {
    const { time } = this.#timelineRuler.clientXToPosition(event.clientX);
    this.time = time;
  };

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const handleEl = document.createElement("div");
    handleEl.classList.add("timeline-playhead-handle");

    this.rootElement.replaceChildren(handleEl);

    this.#handleEl = handleEl;
  }

  // -----------------------------------------------------------------------------
  // ui
  // -----------------------------------------------------------------------------

  #updateUIState() {
    const left = this.#timelineRuler.timeToLeft(this.#time);

    this.rootElement.style.left = `${left}px`;
  }
}
