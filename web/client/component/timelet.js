import { Elm } from "./base/elm.js";
import {
  assertNonNegative,
  assertNonBlankString,
  assertBoolean,
} from "./base/assert.js";
import { formatTime } from "./base/helper.js";

export class Timelet extends Elm {
  // state
  #full = false;
  #prefix = "";
  #suffix = "";

  // state(read-write)
  #seconds = 0;

  // ui
  #prefixEl = null;
  #paddingEl = null;
  #timeEl = null;
  #suffixEl = null;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "timelet",
    });

    this.#init();
    this.#render();
    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("full", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#full = value;
    });

    this.resolveOption("prefix", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#prefix = String(value);
    });

    this.resolveOption("suffix", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#suffix = String(value);
    });

    this.resolveOption("seconds", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#seconds = value;
    });

    this.resolveOption("color", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.rootElement.style.setProperty("--color-time", `${value}`);
    });

    this.resolveOption("fontSize", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.rootElement.style.setProperty("--font-size", `${value}`);
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get seconds() {
    return this.#seconds;
  }

  set seconds(value) {
    assertNonNegative(value, "seconds");

    if (value === this.#seconds) {
      return;
    }

    this.#seconds = value;
    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    this.rootElement.innerHTML = `
      <span data-role="prefix"></span>
      <span data-role="padding"></span><span data-role="time"></span>
      <span data-role="suffix"></span>
    `;

    this.#prefixEl = this.rootElement.querySelector('[data-role="prefix"]');
    this.#paddingEl = this.rootElement.querySelector('[data-role="padding"]');
    this.#timeEl = this.rootElement.querySelector('[data-role="time"]');
    this.#suffixEl = this.rootElement.querySelector('[data-role="suffix"]');
  }

  // -----------------------------------------------------------------------------
  // ui
  // -----------------------------------------------------------------------------

  #updateUIState() {
    const { padding, time } = this.#resolvePaddingAndTime();

    this.#prefixEl.textContent = this.#prefix;
    this.#paddingEl.textContent = padding;
    this.#timeEl.textContent = time;
    this.#suffixEl.textContent = this.#suffix;
  }

  #resolvePaddingAndTime() {
    const text = formatTime(this.#seconds, this.#full);

    const startIndex = text.search(/[1-9]/);

    if (startIndex !== -1) {
      return {
        padding: text.slice(0, startIndex),
        time: text.slice(startIndex),
      };
    }

    return {
      padding: text.slice(0, -5),
      time: text.slice(-5),
    };
  }
}
