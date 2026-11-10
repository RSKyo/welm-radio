import { Elm } from "../base/elm.js";
import {
  assertNonBlankString,
  assertNonNegative,
  assertNonNegativeInteger,
  assertPlainObject,
  assertPositive,
} from "../base/assert.js";
import {
  createElementByHTML,
  clampValue,
  clonePlainObject,
} from "../base/helper.js";

const TRIM_START_TEMPLATE = `
<div class="clip-trim-start" data-role="dragging-start"></div>
`;
const TRIM_END_TEMPLATE = `
<div class="clip-trim-end" data-role="dragging-end"></div>
`;
const TITLE_TEMPLATE = `
<div class="clip-title"></div>
`;
const CONTENT_TEMPLATE = `
<div class="clip-content"></div>
`;

const trimStartTemplate = createElementByHTML(TRIM_START_TEMPLATE);
const trimEndTemplate = createElementByHTML(TRIM_END_TEMPLATE);
const titleTemplate = createElementByHTML(TITLE_TEMPLATE);
const contentTemplate = createElementByHTML(CONTENT_TEMPLATE);

export class Clip extends Elm {
  // state(read-only)
  #clipId = null;
  #title = null;
  #type = null;
  #audioStart = null;
  #audioEnd = null;
  #audioMeta = null;
  // state(read-write)
  #trimStart = null;
  #trimEnd = null;
  #clipStart = null;
  #rowIndex = 0;
  // ui
  #titleEl = null;

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

    this.applyRequiredOption("type", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#type = value;
      this.setDataset("type", value);
    });

    this.applyRequiredOption("audioStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#audioStart = value;
    });

    this.applyRequiredOption("audioEnd", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#audioEnd = value;
    });

    this.applyRequiredOption("audioMeta", (value, assertionSubject) => {
      assertPlainObject(value, assertionSubject);
      this.#audioMeta = value;
    });

    if (this.#audioEnd < this.#audioStart) {
      throw new Error("audioEnd must be greater than or equal to audioStart");
    }

    this.applyRequiredOption("trimStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#trimStart = value;
    });

    this.applyRequiredOption("trimEnd", (value, assertionSubject) => {
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

    this.applyRequiredOption("clipStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#clipStart = value;
    });

    this.applyOption("rowIndex", (value, assertionSubject) => {
      assertNonNegativeInteger(value, assertionSubject);
      this.#rowIndex = value;
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

  get type() {
    return this.#type;
  }

  get audioStart() {
    return this.#audioStart;
  }

  get audioEnd() {
    return this.#audioEnd;
  }

  get audioMeta() {
    return clonePlainObject(this.#audioMeta);
  }

  get trimStart() {
    return this.#trimStart;
  }

  get trimEnd() {
    return this.#trimEnd;
  }

  get duration() {
    return this.trimEnd - this.trimStart;
  }

  get clipStart() {
    return this.#clipStart;
  }

  get clipEnd() {
    return this.clipStart + this.duration;
  }

  get rowIndex() {
    return this.#rowIndex;
  }

  get left() {
    return this.#timelineRuler.timeToPixels(this.clipStart);
  }

  get width() {
    return this.#timelineRuler.timeToPixels(this.duration);
  }

  get endLeft() {
    return this.left + this.width;
  }

  get pixelsPerSecond() {
    return this.#timelineRuler.pixelsPerSecond;
  }

  // -----------------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------------

  update(updatedItem) {
    const oldClipEnd = this.clipEnd;

    this.#setTrimEnd(updatedItem.trimEnd);
    this.#setTrimStart(updatedItem.trimStart);

    this.#setClipStart(updatedItem.clipStart);
    this.#setRowIndex(updatedItem.rowIndex);

    this.#updatePositionUIState();

    if (this.clipEnd !== oldClipEnd) {
      this.#emitClipEndChange();
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

    this.#trimStart = newTrimStart;
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

    this.#trimEnd = newTrimEnd;
  }

  #setClipStart(value) {
    if (value == null) {
      return;
    }

    assertNonNegative(value, "clipStart");

    if (value === this.#clipStart) {
      return;
    }

    this.#clipStart = value;
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
      rowIndex: this.#rowIndex,
      width: this.width,
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

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.registerOffHandler(
      this.#timelineRuler.onPixelsPerSecondChange(() => {
        this.#updateUIState();
      }),
    );

    this.registerOffHandler(
      this.#timelineRuler.onTimelineViewportResize(() => {
        this.#updateTitleUIState();
      }),
    );
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const contentEl = contentTemplate.cloneNode(true);
    const trimStartEl = trimStartTemplate.cloneNode(true);
    const trimEndEl = trimEndTemplate.cloneNode(true);

    this.#titleEl = titleTemplate.cloneNode(true);
    contentEl.appendChild(this.#titleEl);

    this.rootElement.appendChild(contentEl);
    this.rootElement.appendChild(trimStartEl);
    this.rootElement.appendChild(trimEndEl);

    this.#updateUIState();
    this.#updateTitleUIState();
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    this.#updatePositionUIState();
    this.#updateTitleUIState();
  }

  #updatePositionUIState() {
    this.rootElement.style.left = `${this.left}px`;
    this.rootElement.style.width = `${this.width}px`;
  }

  #updateTitleUIState() {
    this.#titleEl.replaceChildren();

    const interval = this.#timelineRuler.timelineViewportContentWidth * (2 / 3);
    if (interval <= 0) {
      return;
    }

    const count = Math.max(1, Math.ceil(this.width / interval));

    for (let i = 0; i < count; i++) {
      const spanEl = document.createElement("span");

      spanEl.textContent = this.#title;
      spanEl.style.width = `${interval}px`;
      spanEl.style.left = `${i * interval}px`;

      this.#titleEl.appendChild(spanEl);
    }
  }
}
