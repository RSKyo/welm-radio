import { Elm } from "../base/elm.js";
import {
  assertNonBlankString,
  assertNonNegative,
  assertNonNegativeInteger,
  assertPositive,
} from "../base/assert.js";
import {
  createElementByHTML,
  normalizeTime,
  normalizePixel,
  clampValue,
} from "../base/helper.js";

const CLIP_TRIM_HANDLE_WIDTH = 4;

const TRIM_START_TEMPLATE = `
<div class="clip-trim-start" data-role="dragging-start"></div>
`;
const TRIM_END_TEMPLATE = `
<div class="clip-trim-end" data-role="dragging-end"></div>
`;
const CONTENT_TEMPLATE = `
<div class="clip-content"></div>
`;

const trimStartTemplate = createElementByHTML(TRIM_START_TEMPLATE);
const trimEndTemplate = createElementByHTML(TRIM_END_TEMPLATE);
const contentTemplate = createElementByHTML(CONTENT_TEMPLATE);

export class Clip extends Elm {
  // state(read-only)
  #clipId = null;
  #title = null;
  #audioStart = null;
  #audioEnd = null;
  // state(read-write)
  #trimStart = null;
  #trimEnd = null;
  #clipStart = null;
  #rowIndex = 0;
  // ui
  #height = null;
  #rowGap = null;

  // ruler
  #timelineRuler = null;
  // playhead
  #timelinePlayhead = null;
  // audio cache
  #audioCache = null;

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
    this.applyRequiredOption("clipId", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#clipId = value;
    });

    this.applyRequiredOption("title", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#title = value;
    });

    this.applyRequiredOption("audioStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#audioStart = normalizeTime(value);
    });

    this.applyRequiredOption("audioEnd", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#audioEnd = normalizeTime(value);
    });

    if (this.#audioEnd < this.#audioStart) {
      throw new Error("audioEnd must be greater than or equal to audioStart");
    }

    this.applyRequiredOption("trimStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#trimStart = normalizeTime(value);
    });

    this.applyRequiredOption("trimEnd", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#trimEnd = normalizeTime(value);
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

    this.applyRequiredOption("clipStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#clipStart = normalizeTime(value);
    });

    this.applyOption("rowIndex", (value, assertionSubject) => {
      assertNonNegativeInteger(value, assertionSubject);
      this.#rowIndex = value;
    });

    this.applyRequiredOption("height", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#height = normalizePixel(value);
      this.rootElement.style.setProperty("--clip-height", `${value}px`);
    });

    this.applyRequiredOption("rowGap", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#rowGap = normalizePixel(value);
    });

    this.applyRequiredOption("timelineRuler", (value) => {
      this.#timelineRuler = value;
    });

    this.applyRequiredOption("timelinePlayhead", (value) => {
      this.#timelinePlayhead = value;
    });

    this.applyOption("audioCache", (value, assertionSubject) => {
      this.#audioCache = value;
    });

    this.rootElement.style.setProperty(
      "--clip-trim-width",
      `${CLIP_TRIM_HANDLE_WIDTH}px`,
    );
  }

  // -----------------------------------------------------------------------------
  // queries / access
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

  get trimStart() {
    return this.#trimStart;
  }

  get trimEnd() {
    return this.#trimEnd;
  }

  get duration() {
    return normalizeTime(this.trimEnd - this.trimStart);
  }

  get clipStart() {
    return this.#clipStart;
  }

  get clipEnd() {
    return normalizeTime(this.clipStart + this.duration);
  }

  get rowIndex() {
    return this.#rowIndex;
  }

  get height() {
    return this.#height;
  }

  get rowGap() {
    return this.#rowGap;
  }

  get rowHeight() {
    return normalizePixel(this.height + this.rowGap);
  }

  get top() {
    return normalizePixel(this.rowIndex * this.rowHeight + this.rowGap);
  }

  get left() {
    return this.#timelineRuler.timeToPixels(this.clipStart);
  }

  get width() {
    return this.#timelineRuler.timeToPixels(this.duration);
  }

  get endLeft() {
    return normalizePixel(this.left + this.width);
  }

  get pixelsPerSecond() {
    return this.#timelineRuler.pixelsPerSecond;
  }

  // -----------------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------------

  update(updatedItem) {
    const oldClipEnd = this.clipEnd;
    const oldRowIndex = this.rowIndex;

    this.#setTrimEnd(updatedItem.trimEnd);
    this.#setTrimStart(updatedItem.trimStart);

    this.#setClipStart(updatedItem.clipStart);
    this.#setRowIndex(updatedItem.rowIndex);

    this.#updatePositionUIState();

    if (this.clipEnd !== oldClipEnd) {
      this.#emitClipEndChange();
    }

    if (this.rowIndex !== oldRowIndex) {
      this.#emitRowIndexChange();
    }
  }

  #setTrimStart(value) {
    if (value == null) {
      return;
    }

    assertNonNegative(value, "trimStart");

    const newTrimStart = clampValue(value, this.audioStart, this.trimEnd);

    if (newTrimStart === this.#trimStart) {
      return;
    }

    this.#trimStart = normalizeTime(newTrimStart);
  }

  #setTrimEnd(value) {
    if (value == null) {
      return;
    }

    assertNonNegative(value, "trimEnd");

    const newTrimEnd = clampValue(value, this.trimStart, this.audioEnd);

    if (newTrimEnd === this.#trimEnd) {
      return;
    }

    this.#trimEnd = normalizeTime(newTrimEnd);
  }

  #setClipStart(value) {
    if (value == null) {
      return;
    }

    assertNonNegative(value, "clipStart");

    if (value === this.#clipStart) {
      return;
    }

    this.#clipStart = normalizeTime(value);
  }

  #setRowIndex(value) {
    if (value == null) {
      return;
    }

    assertNonNegativeInteger(value, "rowIndex");

    if (value === this.#rowIndex) {
      return;
    }

    this.#rowIndex = value;
  }

  // -----------------------------------------------------------------------------
  // methods
  // -----------------------------------------------------------------------------

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

  onClipEndChange(handler) {
    return this.handler.on("clipEndChangeHandler", handler);
  }

  #emitClipEndChange() {
    this.handler.emit("clipEndChangeHandler", this.#getClipDetail());
  }

  onRowIndexChange(handler) {
    return this.handler.on("rowIndexChangeHandler", handler);
  }

  #emitRowIndexChange() {
    this.handler.emit("rowIndexChangeHandler", this.#getClipDetail());
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.registerOffHandler(
      this.#timelineRuler.onPixelsPerSecondChange(() => {
        this.#updatePositionUIState();
      }),
    );
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    // main
    const contentEl = contentTemplate.cloneNode(true);
    const trimStartEl = trimStartTemplate.cloneNode(true);
    const trimEndEl = trimEndTemplate.cloneNode(true);

    this.rootElement.appendChild(contentEl);
    this.rootElement.appendChild(trimStartEl);
    this.rootElement.appendChild(trimEndEl);

    contentEl.textContent = this.#clipId;

    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    this.#updatePositionUIState();
  }

  #updatePositionUIState() {
    const offsetTop = this.#rowGap === 0 ? 0 : 1 + (this.#rowGap - 1) / 2;
    this.rootElement.style.top = `${this.top - offsetTop}px`;
    this.rootElement.style.left = `${this.left}px`;
    this.rootElement.style.width = `${this.width}px`;
  }
}
