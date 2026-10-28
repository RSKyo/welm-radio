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
  #frontTrim = "end";
  #trimStartEl = null;
  #trimEndEl = null;
  #contentEl = null;

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

  get frontTrim() {
    return this.#frontTrim;
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
    this.#timelineRuler.timeToPixel(0);
    return normalizePixel(this.clipStart * this.pixelsPerSecond);
  }

  get width() {
    return normalizePixel(this.duration * this.pixelsPerSecond);
  }

  get endLeft() {
    return normalizePixel(this.left + this.width);
  }

  get pixelsPerSecond() {
    return this.#timelineRuler.pixelsPerSecond;
  }

  // -----------------------------------------------------------------------------
  // setters / mutators
  // -----------------------------------------------------------------------------

  set trimStart(value) {
    assertNonNegative(value, "trimStart");
    this.#setTrimStart(value);
  }

  #setTrimStart(value, { updateClipStart = true, updateUI = true } = {}) {
    const oldTrimStart = this.#trimStart;
    const newTrimStart = Math.max(
      this.#audioStart,
      Math.min(value, this.#trimEnd),
    );

    if (newTrimStart === oldTrimStart) {
      return;
    }

    this.#trimStart = newTrimStart;

    if (updateClipStart) {
      const oldClipStart = this.#clipStart;

      const delta = newTrimStart - oldTrimStart;
      const newClipStart = normalizeTime(Math.max(0, oldClipStart + delta));

      this.#clipStart = newClipStart;
    }

    if (updateUI) {
      this.#updatePositionUIState();
    }
  }

  set trimEnd(value) {
    assertNonNegative(value, "trimEnd");
    this.#setTrimEnd(value);
  }

  #setTrimEnd(value, { updateUI = true } = {}) {
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

    if (updateUI) {
      this.#updatePositionUIState();
    }

    this.#emitClipEndChange();
  }

  set clipStart(value) {
    assertNonNegative(value, "clipStart");
    this.#setClipStart(value);
  }

  #setClipStart(value, { updateUI = true, emitEvent = true } = {}) {
    if (value === this.#clipStart) {
      return;
    }

    const oldClipEnd = this.clipEnd;

    this.#clipStart = value;

    if (updateUI) {
      this.#updatePositionUIState();
    }

    const newClipEnd = this.clipEnd;
    if (newClipEnd !== oldClipEnd && emitEvent) {
      this.#emitClipEndChange();
    }
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

  set frontTrim(value) {
    if (value !== "start" && value !== "end") {
      throw new Error('frontTrim must be "start" or "end"');
    }
    this.#setFrontTrim(value);
  }

  #setFrontTrim(value, { updateUI = true } = {}) {
    if (value === this.#frontTrim) {
      return;
    }

    this.#frontTrim = value;

    if (updateUI) {
      this.#updateFrontTrimState();
    }
  }

  setTrimStartAndClipStart(trimStart, clipStart) {
    const oldClipEnd = this.clipEnd;

    if (trimStart != null) {
      this.#setTrimStart(trimStart, {
        updateClipStart: false,
        updateUI: false,
      });
    }

    if (clipStart != null) {
      this.#setClipStart(clipStart, {
        updateUI: false,
        emitEvent: false,
      });
    }

    this.#updatePositionUIState();

    if (this.clipEnd !== oldClipEnd) {
      this.#emitClipEndChange();
    }
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

  set onClipEndChange(handler) {
    this.handler.on("clipEndChangeHandler", handler);
  }

  #emitClipEndChange() {
    this.handler.emit("clipEndChangeHandler", this.#getClipDetail());
  }

  set onRowIndexChange(handler) {
    this.handler.on("rowIndexChangeHandler", handler);
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
    const contentEl = contentTemplate.cloneNode(true);
    const trimStartEl = trimStartTemplate.cloneNode(true);
    const trimEndEl = trimEndTemplate.cloneNode(true);

    this.rootElement.appendChild(contentEl);
    this.rootElement.appendChild(trimStartEl);
    this.rootElement.appendChild(trimEndEl);

    this.#contentEl = contentEl;
    this.#trimStartEl = trimStartEl;
    this.#trimEndEl = trimEndEl;

    contentEl.textContent = this.#clipId;

    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    this.#updatePositionUIState();
    this.#updateFrontTrimState();
  }

  #updatePositionUIState() {
    const offsetTop = this.#rowGap === 0 ? 0 : 1 + (this.#rowGap - 1) / 2;
    this.rootElement.style.top = `${this.top - offsetTop}px`;
    this.rootElement.style.left = `${this.left}px`;
    this.rootElement.style.width = `${this.width}px`;
  }

  #updateFrontTrimState() {
    this.#trimStartEl.style.zIndex = this.#frontTrim === "start" ? "11" : "10";
    this.#trimEndEl.style.zIndex = this.#frontTrim === "end" ? "11" : "10";
  }
}
