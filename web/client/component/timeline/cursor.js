import { Elm } from "../base/elm.js";
import { on } from "../base/helper.js";

export class TimelineCursor extends Elm {
  #timelineRuler = null;

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
    this.resolveOption("timelineRuler", (value, assertionSubject) => {
      this.#timelineRuler = value;
    });

    if (this.#timelineRuler == null) {
      throw new Error("Timeline ruler not found");
    }
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
    const timelineCanvasEl = this.#timelineRuler.timelineCanvas.element;

    on(timelineCanvasEl, "pointermove", (event) => {
      const { left, time } = this.#timelineRuler.clientXToPosition(
        event.clientX,
      );

      this.rootElement.style.left = `${left}px`;
      this.#emitTimeChange(time);
    });
  }
}
