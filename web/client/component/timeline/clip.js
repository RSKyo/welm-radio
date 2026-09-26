import { Elm } from "../base/elm.js";
import { assertNonNegative, assertPositive } from "../base/assert.js";
import { createElementByHTML } from "../base/elm-helper.js";

const MAIN_TEMPLATE = `
<div data-role="main">
</div>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);

export class Clip extends Elm {
  // state(read-only)
  #id = "";
  #title = "";
  #audioStart = 0;
  #audioEnd = 0;
  // state(read-write)
  #trimStart = 0;
  #trimEnd = 0;
  #clipStart = 0;
  #pixelsPerSecond = 0;
  // ui
  #height = 40;
  #rowGap = 4;
  #rowIndex = 0;

  constructor(root, options = {}) {
    super(root, {
      defaultRootClass: "clip",
      ...options,
    });

    this.#init();
    this.#render();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("id", (value) => {
      this.#id = value;
    });

    this.resolveOption("title", (value) => {
      this.#title = value;
    });

    this.resolveOption("audioStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#audioStart = value;
    });

    this.resolveOption("audioEnd", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#audioEnd = value;
    });

    if (this.#audioEnd < this.#audioStart) {
      throw new Error("audioEnd must be greater than or equal to audioStart");
    }

    this.resolveOption("trimStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#trimStart = value;
    });

    this.resolveOption("trimEnd", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#trimEnd = value;
    });

    if (this.#trimEnd < this.#trimStart) {
      throw new Error("trimEnd must be greater than or equal to trimStart");
    }

    if (
      this.#trimStart < this.#audioStart ||
      this.#trimStart >= this.#audioEnd
    ) {
      throw new Error(
        "trimStart must be greater than or equal to audioStart and less than audioEnd",
      );
    }

    if (this.#trimEnd <= this.#audioStart || this.#trimEnd > this.#audioEnd) {
      throw new Error(
        "trimEnd must be greater than audioStart and less than or equal to audioEnd",
      );
    }

    this.resolveOption("clipStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#clipStart = value;
    });

    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });

    this.resolveOption("height", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#height = value;
      this.rootElement.style.setProperty("--clip-height", `${value}px`);
    });

    this.resolveOption("rowGap", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#rowGap = value;
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get id() {
    return this.#id;
  }

  get title() {
    return this.#title;
  }

  get audioStart() {
    return this.#audioStart;
  }

  get audioEnd() {
    return this.#audioEnd;
  }

  get duration() {
    return this.#trimEnd - this.#trimStart;
  }

  get clipEnd() {
    return this.#clipStart + this.duration;
  }

  get height() {
    return this.#height;
  }

  get rowGap() {
    return this.#rowGap;
  }

  get rowIndex() {
    return this.#rowIndex;
  }

  get top() {
    return this.#rowIndex * (this.#height + this.#rowGap) + this.#rowGap;
  }

  get left() {
    return this.#clipStart * this.#pixelsPerSecond;
  }

  get width() {
    return this.duration * this.#pixelsPerSecond;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get trimStart() {
    return this.#trimStart;
  }

  set trimStart(value) {
    assertNonNegative(value, "trimStart");

    if (value === this.#trimStart) {
      return;
    }

    if (value < this.#audioStart || value >= this.#audioEnd) {
      throw new Error(
        "trimStart must be greater than or equal to audioStart and less than audioEnd",
      );
    }

    if (value > this.#trimEnd) {
      throw new Error("trimStart must be less than or equal to trimEnd");
    }

    const oldTrimStart = this.#trimStart;

    this.#trimStart = value;

    const delta = value - oldTrimStart;
    const newClipStart = this.#clipStart + delta;

    let clipEndChanged = false;

    if (newClipStart < 0) {
      this.#clipStart = 0;
      clipEndChanged = true;
    } else {
      this.#clipStart = newClipStart;
    }

    this.#updatePositionUIState();

    if (clipEndChanged) {
      this.#emitClipEndChange();
    }
  }

  get trimEnd() {
    return this.#trimEnd;
  }

  set trimEnd(value) {
    assertNonNegative(value, "trimEnd");

    if (value === this.#trimEnd) {
      return;
    }

    if (value <= this.#audioStart || value > this.#audioEnd) {
      throw new Error(
        "trimEnd must be greater than audioStart and less than or equal to audioEnd",
      );
    }

    if (value < this.#trimStart) {
      throw new Error("trimEnd must be greater than or equal to trimStart");
    }

    this.#trimEnd = value;
    this.#updatePositionUIState();
    this.#emitClipEndChange();
  }

  get clipStart() {
    return this.#clipStart;
  }

  set clipStart(value) {
    assertNonNegative(value, "clipStart");

    if (value === this.#clipStart) {
      return;
    }

    this.#clipStart = value;
    this.#updatePositionUIState();
    this.#emitClipEndChange();
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
    this.#updatePositionUIState();
  }

  // -----------------------------------------------------------------------------
  // methods
  // -----------------------------------------------------------------------------
  dragTo(x, y) {
    assertNonNegative(x, "x");
    assertNonNegative(y, "y");

    const rowHeight = this.#height + this.#rowGap;
    const newRowIndex = Math.floor(y / rowHeight);
    const clipTop = newRowIndex * rowHeight + this.#rowGap;

    if (y < clipTop) {
      return;
    }

    const oldRowIndex = this.#rowIndex;
    this.#rowIndex = newRowIndex;

    const oldClipStart = this.#clipStart;
    const newClipStart = Number((x / this.#pixelsPerSecond).toFixed(3));
    this.#clipStart = newClipStart;

    this.#updatePositionUIState();

    if (oldClipStart !== newClipStart) {
      this.#emitClipEndChange();
    }

    if (oldRowIndex !== newRowIndex) {
      this.#emitRowIndexChange();
    }
  }

  #getClipDetail() {
    return {
      elm: this,
      clipStart: this.#clipStart,
      clipEnd: this.clipEnd,
      duration: this.duration,
      left: this.left,
      top: this.top,
      rowIndex: this.#rowIndex,
      width: this.width,
      height: this.height,
      rowGap: this.#rowGap,
    };
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onClipEndChange(handler) {
    this.handler.set("clipEndChangeHandler", handler);
  }

  #emitClipEndChange() {
    this.handler.emit("clipEndChangeHandler", this.#getClipDetail());
  }

  set onRowIndexChange(handler) {
    this.handler.set("rowIndexChangeHandler", handler);
  }

  #emitRowIndexChange() {
    this.handler.emit("rowIndexChangeHandler", this.#getClipDetail());
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {}

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    this.#updatePositionUIState();
  }

  #updatePositionUIState() {
    this.rootElement.style.top = `${this.top}px`;
    this.rootElement.style.left = `${this.left}px`;
    this.rootElement.style.width = `${this.width}px`;
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    // main
    const mainEl = mainTemplate.cloneNode(true);
    mainEl.textContent = this.#id;

    this.rootElement.appendChild(mainEl);

    this.#updateUIState();
  }
}
