import { Elm } from "../base/elm.js";
import {
  assertNonNegative,
  assertNonNegativeInteger,
  assertPositive,
} from "../base/assert.js";
import { createElementByHTML } from "../base/elm-helper.js";

const DEFAULT_CLIP_HEIGHT = 40;
const DEFAULT_CLIP_ROW_GAP = 4;

const MAIN_TEMPLATE = `
<div data-role="main">
</div>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);

export class Clip extends Elm {
  // state(read-only)
  #clipId = "";
  #title = "";
  #audioStart = 0;
  #audioEnd = 0;
  // state(read-write)
  #trimStart = 0;
  #trimEnd = 0;
  #clipStart = 0;
  #rowIndex = 0;
  #pixelsPerSecond = 0;
  // ui
  #height = DEFAULT_CLIP_HEIGHT;
  #rowGap = DEFAULT_CLIP_ROW_GAP;

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
    this.resolveOption("clipId", (value) => {
      this.#clipId = value;
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

    this.resolveOption("rowIndex", (value, assertionSubject) => {
      assertNonNegativeInteger(value, assertionSubject);
      this.#rowIndex = value;
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

  get clipId() {
    return this.#clipId;
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
    return Number((this.#trimEnd - this.#trimStart).toFixed(3));
  }

  get clipEnd() {
    return Number((this.#clipStart + this.duration).toFixed(3));
  }

  get height() {
    return this.#height;
  }

  get rowGap() {
    return this.#rowGap;
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
      return;
    }

    if (value > this.#trimEnd) {
      return;
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
      return;
    }

    if (value < this.#trimStart) {
      return;
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
    this.#setClipStart(value);
  }

  #setClipStart(value, { updateUI = true } = {}) {
    if (value === this.#clipStart) {
      return;
    }

    this.#clipStart = value;

    if (updateUI) {
      this.#updatePositionUIState();
    }

    this.#emitClipEndChange();
  }

  get rowIndex() {
    return this.#rowIndex;
  }

  set rowIndex(value) {
    assertNonNegativeInteger(value, "rowIndex");
    this.#setRowIndex(value);
  }

  #setRowIndex(value, { updateUI = true } = {}) {
    if (value === this.#rowIndex) {
      return;
    }

    this.#rowIndex = value;

    if (updateUI) {
      this.#updatePositionUIState();
    }

    this.#emitRowIndexChange();
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

  xToClipStart(x) {
    assertNonNegative(x, "x");
    return Number((x / this.#pixelsPerSecond).toFixed(3));
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
  // render
  // -----------------------------------------------------------------------------

  #render() {
    // main
    const mainEl = mainTemplate.cloneNode(true);
    mainEl.textContent = this.#clipId;

    this.rootElement.appendChild(mainEl);

    this.#updateUIState();
  }

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
}
