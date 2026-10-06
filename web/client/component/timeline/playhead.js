import { Elm } from "../base/elm.js";
import { assertNonNegative, assertPositive } from "../base/assert.js";

export class TimelinePlayhead extends Elm {
  // state(read-write)
  #pixelsPerSecond = 50;
  #time = 0;
  #draggingPointerId = null;

  // ui
  #containerEl = null;
  #handleEl = null;
  #dragOffsetX = 0;

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
    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });

    this.resolveOption("time", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#time = value;
    });

    const containerEl = this.rootElement.parentElement;
    if (!containerEl) {
      throw new Error("Container element not found");
    }

    this.#containerEl = containerEl;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get time() {
    return Number(this.#time.toFixed(3));
  }

  set time(value) {
    assertNonNegative(value, "time");

    if (value === this.#time) {
      return;
    }

    this.#time = value;
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
  // state(read-only)
  // -----------------------------------------------------------------------------

  get left() {
    if (this.#pixelsPerSecond == null) {
      return 0;
    }

    return Number((this.#time * this.#pixelsPerSecond).toFixed(2));
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
  // binding events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.#handleEl, "pointerdown", this.#pointerDownHandler);
    this.event.on(this.#handleEl, "pointermove", this.#pointerMoveHandler);
    this.event.on(this.#handleEl, "pointerup", this.#pointerUpHandler);
    this.event.on(this.#handleEl, "pointercancel", this.#pointerCancelHandler);
  }

  #pointerDownHandler = (event) => {
    if (event.button !== 0) {
      return;
    }

    if (this.#draggingPointerId != null) {
      return;
    }

    const rect = this.#containerEl.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;

    this.#dragOffsetX = pointerX - this.left;

    this.#draggingPointerId = event.pointerId;

    this.#handleEl.setPointerCapture(event.pointerId);

    event.preventDefault();
  };

  #pointerMoveHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    if (event.buttons === 0) {
      this.#endDragging();
      return;
    }

    this.#updateTimeByPointer(event);
  };

  #pointerUpHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    this.#updateTimeByPointer(event);
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
    this.#dragOffsetX = 0;

    if (
      pointerId != null &&
      this.#handleEl.hasPointerCapture(pointerId)
    ) {
      this.#handleEl.releasePointerCapture(pointerId);
    }
  }

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
    if (this.left >= this.#containerEl.clientWidth) {
      this.rootElement.style.left = `${this.#containerEl.clientWidth - 1}px`;
    } else {
      this.rootElement.style.left = `${this.left}px`;
    }
  }

  #updateTimeByPointer(event) {
    const rect = this.#containerEl.getBoundingClientRect();

    let contentX =
      event.clientX -
      rect.left -
      this.#dragOffsetX;

    contentX = Math.min(
      Math.max(contentX, 0),
      this.#containerEl.clientWidth,
    );

    this.time = contentX / this.#pixelsPerSecond;
  }
}