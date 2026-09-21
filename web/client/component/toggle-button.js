import { Elm } from "./base/elm.js";
import { assertNonBlankString } from "./base/assert.js";
import { isEqualValue } from "./base/elm-helper.js";

export class ToggleButton extends Elm {
  // state(read-only)
  #activeValue = true;
  #inactiveValue = false;
  #activeColor = null;

  // state(read-write)
  #value = false;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "toggle-button",
    });

    this.#init();
    this.#updateUIState();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("activeValue", (value) => {
      this.#activeValue = value;
    });

    this.resolveOption("inactiveValue", (value) => {
      this.#inactiveValue = value;
    });

    this.resolveOption("activeColor", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#activeColor = value;
    });

    this.resolveOption("value", (value) => {
      this.#value = value;
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get activeValue() {
    return this.#activeValue;
  }

  get inactiveValue() {
    return this.#inactiveValue;
  }

  get activeColor() {
    return this.#activeColor;
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
    if (
      !isEqualValue(value, this.#activeValue) &&
      !isEqualValue(value, this.#inactiveValue)
    ) {
      throw new Error("value must be activeValue or inactiveValue");
    }

    if (isEqualValue(value, this.#value)) {
      return;
    }

    this.#value = value;

    this.#updateUIState();
    this.#emitChange();
  }

  get active() {
    return isEqualValue(this.#value, this.#activeValue);
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
      active: this.active,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "click", () => {
      this.value = this.active
        ? this.#inactiveValue
        : this.#activeValue;
    });
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    const active = this.active;

    this.rootElement.classList.toggle("is-active", active);

    if (this.#activeColor != null) {
      this.rootElement.style.backgroundColor = active
        ? this.#activeColor
        : "";
    }
  }
}