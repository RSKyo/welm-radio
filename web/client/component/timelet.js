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

  // element
  #prefixEl = null;
  #paddingEl = null;
  #timeEl = null;
  #suffixEl = null;

  constructor(root, options = {}) {
    super(root, {
      defaultRootClass: "timelet",
      ...options,
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
      this.#prefix = value;
    });

    this.resolveOption("suffix", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#suffix = value;
    });

    this.resolveOption("seconds", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#seconds = value;
    });

    this.resolveOption("color", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.rootElement.style.setProperty("--color-time", value);
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
      <span class="timelet-prefix"></span>
      <span class="timelet-padding"></span><span class="timelet-time"></span>
      <span class="timelet-suffix"></span>
    `;

    this.#prefixEl = this.rootElement.querySelector(".timelet-prefix");
    this.#paddingEl = this.rootElement.querySelector(".timelet-padding");
    this.#timeEl = this.rootElement.querySelector(".timelet-time");
    this.#suffixEl = this.rootElement.querySelector(".timelet-suffix");
  }

  // -----------------------------------------------------------------------------
  // update ui state
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

    let startIndex = text.search(/[1-9]/);

    if (startIndex === -1) {
      startIndex = text.length - 5;
    } else {
      const decimalIndex = text.indexOf(".");

      if (decimalIndex !== -1 && startIndex > decimalIndex) {
        startIndex = decimalIndex - 1;
      }
    }

    return {
      padding: text.slice(0, startIndex),
      time: text.slice(startIndex),
    };
  }
}