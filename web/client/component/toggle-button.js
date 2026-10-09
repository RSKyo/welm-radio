import { Elm } from "./base/elm.js";
import { assertNonBlankString } from "./base/assert.js";
import { isEqualValue } from "./base/helper.js";

export class ToggleButton extends Elm {
  // state(read-only)
  #activeText = "On";
  #inactiveText = "Off";
  #activeValue = true;
  #inactiveValue = false;

  // state(read-write)
  #value = false;

  constructor(root, options = {}) {
    super(root, {
      defaultRootClass: "toggle-button",
      ...options,
    });

    this.#init();
    this.#updateUIState();
    this.#bindEvents();
  }

  #assertValue(value, assertionSubject = "value") {
    if (
      !isEqualValue(value, this.#activeValue) &&
      !isEqualValue(value, this.#inactiveValue)
    ) {
      throw new Error(
        `${assertionSubject} must be activeValue or inactiveValue`,
      );
    }
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("activeText", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#activeText = value;
    });

    this.resolveOption("inactiveText", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#inactiveText = value;
    });

    this.resolveOption("activeValue", (value) => {
      this.#activeValue = value;
    });

    this.resolveOption("inactiveValue", (value) => {
      this.#inactiveValue = value;
      this.#value = value;
    });

    if (isEqualValue(this.#activeValue, this.#inactiveValue)) {
      throw new Error("activeValue and inactiveValue must be different");
    }

    this.resolveOption("value", (value, assertionSubject) => {
      this.#assertValue(value, assertionSubject);
      this.#value = value;
    });

    this.resolveOption("color", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.rootElement.style.setProperty("--color-toggle-button", value);
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get isActive() {
    return isEqualValue(this.#value, this.#activeValue);
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  set value(value) {
    this.#setValue(value);
  }

  #setValue(value) {
    this.#assertValue(value, "value");

    if (isEqualValue(value, this.#value)) {
      return;
    }

    this.#value = value;

    this.#updateUIState();
    this.#emitChange();
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onChange(handler) {
    this.handler.set("changeHandler", handler);
  }

  #emitChange() {
    this.handler.emit("changeHandler", {
      elm: this,
      value: this.#value,
      active: this.isActive,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "click", () => {
      this.#setValue(this.isActive ? this.#inactiveValue : this.#activeValue);
    });
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    const active = this.isActive;

    this.rootElement.classList.toggle("is-active", active);

    this.rootElement.textContent = active
      ? this.#activeText
      : this.#inactiveText;
  }
}

export class CompactToggleButton extends ToggleButton {
  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "toggle-button toggle-button-compact",
    });
  }
}
