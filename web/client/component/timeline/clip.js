import { Elm } from "../base/elm.js";
import { assertNonNegative, assertPositive } from "../base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
} from "../base/elm-helper.js";

const MAIN_TEMPLATE = `
<div data-role="main">
</div>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);

export class Clip extends Elm {
  // state(read-only)
  #id = "";
  #title = "";

  // state(read-write)
  #audioStart = 0;
  #audioEnd = 0;
  #clipStart = 0;
  #pixelsPerSecond = 0;

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
      assertNonNegative(value, assertionSubject);
      this.#audioEnd = value;
    });

    if (this.#audioEnd < this.#audioStart) {
      throw new Error("audioEnd must be greater than or equal to audioStart");
    }

    this.resolveOption("clipStart", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#clipStart = value;
    });

    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerSecond = value;
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

  get duration() {
    return this.#audioEnd - this.#audioStart;
  }

  get clipEnd() {
    return this.#clipStart + this.duration;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get audioStart() {
    return this.#audioStart;
  }

  set audioStart(value) {
    assertNonNegative(value, "audioStart");

    if (value === this.#audioStart) {
      return;
    }

    if (value > this.#audioEnd) {
      throw new Error("audioStart must be less than or equal to audioEnd");
    }

    this.#audioStart = value;
    this.#updatePositionUIState();
  }

  get audioEnd() {
    return this.#audioEnd;
  }

  set audioEnd(value) {
    assertNonNegative(value, "audioEnd");

    if (value === this.#audioEnd) {
      return;
    }

    if (value < this.#audioStart) {
      throw new Error("audioEnd must be greater than or equal to audioStart");
    }

    this.#audioEnd = value;
    this.#updatePositionUIState();
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
    const left = this.#clipStart * this.#pixelsPerSecond;
    const width = this.duration * this.#pixelsPerSecond;

    this.rootElement.style.left = `${left}px`;
    this.rootElement.style.width = `${width}px`;
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    // main
    const mainEl = mainTemplate.cloneNode(true);
    mainEl.textContent = this.#id;
    this.rootElement.style.left = `${this.#clipStart * this.#pixelsPerSecond}px`;
    this.rootElement.style.width = `${this.duration * this.#pixelsPerSecond}px`;

    this.rootElement.appendChild(mainEl);

    this.#updateUIState();
  }
}
