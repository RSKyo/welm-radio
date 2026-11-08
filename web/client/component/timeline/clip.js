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
  normalizePixel,
  clampValue,
  clonePlainObject,
} from "../base/helper.js";

const CLIP_TRIM_HANDLE_WIDTH = 4;
const CLIP_TITLE_HEIGHT = 10;
const CLIP_TITLE_INTERVAL = 150;

const clipColorThemes = {
  default: {
    clip: "#C7D2DC",
    clipHover: "#BDC9D4",
    clipSelected: "#ACBBC8",
    clipSelectedHover: "#A2B2C0",
    clipBorder: "#8FA2B2",
    clipDraggingBorder: "#6F7F8C",
    clipTitle: "#4C5B67",
  },

  sky: {
    clip: "#A6D8EE",
    clipHover: "#9ACFE8",
    clipSelected: "#88C2DE",
    clipSelectedHover: "#7DB8D5",
    clipBorder: "#68A9C7",
    clipDraggingBorder: "#66818F",
    clipTitle: "#385A69",
  },

  lavender: {
    clip: "#D8C3F3",
    clipHover: "#D1B8EE",
    clipSelected: "#C4A6E4",
    clipSelectedHover: "#BA9ADC",
    clipBorder: "#A98BD0",
    clipDraggingBorder: "#81708F",
    clipTitle: "#5A4A6A",
  },

  mint: {
    clip: "#B5E5CA",
    clipHover: "#A9DFC2",
    clipSelected: "#98D3B4",
    clipSelectedHover: "#8DC9AA",
    clipBorder: "#79B99A",
    clipDraggingBorder: "#6B897A",
    clipTitle: "#405F51",
  },

  cyan: {
    clip: "#B1E1DF",
    clipHover: "#A6D9D7",
    clipSelected: "#94CCCA",
    clipSelectedHover: "#89C2C0",
    clipBorder: "#73B3B1",
    clipDraggingBorder: "#688482",
    clipTitle: "#3E5D5C",
  },

  peach: {
    clip: "#F6C7A3",
    clipHover: "#F1BD96",
    clipSelected: "#E8AE84",
    clipSelectedHover: "#DFA376",
    clipBorder: "#D29063",
    clipDraggingBorder: "#8E7768",
    clipTitle: "#665044",
  },

  lemon: {
    clip: "#ECE59C",
    clipHover: "#E6DE90",
    clipSelected: "#D9D080",
    clipSelectedHover: "#D0C675",
    clipBorder: "#BBB05F",
    clipDraggingBorder: "#85806B",
    clipTitle: "#5E5A3E",
  },

  slateLavender: {
    clip: "#C8CADF",
    clipHover: "#BEC1D8",
    clipSelected: "#ADB1CC",
    clipSelectedHover: "#A3A8C3",
    clipBorder: "#9298B7",
    clipDraggingBorder: "#70768D",
    clipTitle: "#4E536A",
  },
};

const audioTypeClipColorTheme = {
  voice: "sky",
  music: "lavender",
  bed: "mint",
  ambience: "cyan",
  effect: "peach",
  jingle: "lemon",
  mixed: "slateLavender",
};

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
  #height = null;
  #rowGap = null;
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

    this.rootElement.style.setProperty(
      "--clip-title-height",
      `${CLIP_TITLE_HEIGHT}px`,
    );

    this.rootElement.style.setProperty(
      "--clip-title-interval",
      `${CLIP_TITLE_INTERVAL}px`,
    );

    const themeName = audioTypeClipColorTheme[this.#type] ?? "default";
    const colors = clipColorThemes[themeName];

    this.rootElement.style.setProperty("--color-clip", colors.clip);
    this.rootElement.style.setProperty("--color-clip-hover", colors.clipHover);
    this.rootElement.style.setProperty(
      "--color-clip-selected",
      colors.clipSelected,
    );
    this.rootElement.style.setProperty(
      "--color-clip-selected-hover",
      colors.clipSelectedHover,
    );
    this.rootElement.style.setProperty(
      "--color-clip-border",
      colors.clipBorder,
    );
    this.rootElement.style.setProperty(
      "--color-clip-dragging-border",
      colors.clipDraggingBorder,
    );
    this.rootElement.style.setProperty("--color-clip-title", colors.clipTitle);
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

  get height() {
    return this.#height;
  }

  get rowGap() {
    return this.#rowGap;
  }

  get rowHeight() {
    return this.height + this.rowGap;
  }

  get top() {
    return this.rowIndex * this.rowHeight + this.rowGap;
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
        this.#updateUIState();
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
    const offsetTop = this.#rowGap === 0 ? 0 : 1 + (this.#rowGap - 1) / 2;
    this.rootElement.style.top = `${this.top - offsetTop}px`;
    this.rootElement.style.left = `${this.left}px`;
    this.rootElement.style.width = `${this.width}px`;
  }

  #updateTitleUIState() {
    this.#titleEl.replaceChildren();

    const count = Math.max(1, Math.ceil(this.width / CLIP_TITLE_INTERVAL));

    for (let i = 0; i < count; i++) {
      const spanEl = document.createElement("span");
      spanEl.textContent = this.#title;
      spanEl.style.left = `${i * CLIP_TITLE_INTERVAL + CLIP_TRIM_HANDLE_WIDTH}px`;

      this.#titleEl.appendChild(spanEl);
    }
  }
}
