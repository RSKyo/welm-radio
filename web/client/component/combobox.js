import { Elm } from "./base/elm.js";
import {
  isNullishOrEmpty,
  assertNonBlankString,
  assertNonBlankStringArray,
  assertNoDuplicateValues,
} from "./base/assert.js";

const MAIN_TEMPLATE = `
<div class="combobox-main" data-role="main">
  <input
    class="combobox-input"
    type="text"
    autocomplete="off"
    placeholder="Select or enter an option"
    data-role="input"
  />
  <div class="combobox-dropdown" data-role="dropdown"></div>
</div>
`;

const DROPDOWN_ITEM_TEMPLATE = `
<div class="combobox-item" data-role="dropdown-item"></div>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);
const dropdownItemTemplate = createElementByHTML(DROPDOWN_ITEM_TEMPLATE);

export class Combobox extends Elm {
  // state
  #value;
  #dropdownValues = [];

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "combobox",
    });

    this.#init();
    this.#render();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.valueState.define("value", null, 1);
    this.valueState.define("dropdownValues", null, 2);
  }

  // -----------------------------------------------------------------------------
  // get/set state value
  // -----------------------------------------------------------------------------

  get value() {
    return this.valueState.get("value");
  }

  set value(value) {
    assertNonBlankString(value, "value");
    this.valueState.set("value", value);
  }

  get dropdownValues() {
    return this.valueState.get("dropdownValues");
  }

  set dropdownValues(values) {
    assertNonBlankStringArray(values, "values");
    this.valueState.set("dropdownValues", values);
  }


  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onChange(handler) {
    this.handlerRegistry.set("onChange", handler);
  }

  #emitChange(newValue) {
    this.handlerRegistry.emit("onChange", {
      elm: this,
      value: newValue,
    });
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.dom.add("main",mainTemplate.cloneNode(true));
  }

  #renderDropdownValues(values) {
    const dropdownEl = this.dom.getBySelector("main",'[data-role="dropdown"]');
    this.dom.clear("dropdown");

    for (const value of values) {
      const dropdownItemEl = this.resolveElement(DROPDOWN_ITEM_TEMPLATE);

      dropdownItemEl.textContent = value;
      dropdownItemEl.dataset.value = value;

      this.dom.add(`dropdown-${value}`, dropdownItemEl, "dropdown");
    }
  }

  // ---------------------------------------------------------------------------
  // events
  // ---------------------------------------------------------------------------


  /** bind events */

  #bindEvents() {
    this.valueState.afterValueStateSet = this.#afterValueStateSet;

    this.dom.on("input", "focus", this.#handleInputFocus);
    this.dom.on("input", "blur", this.#handleInputBlur);
    this.dom.on("input", "change", this.#handleInputChange);

    this.dom.on("dropdown", "mousedown", this.#handleDropdownMouseDown);
    this.dom.on("dropdown", "click", this.#handleDropdownClick);
  }

  #afterValueStateSet({ key, newValue }) {
    if (key === "value") {
      this.#updateInputValue();
      this.#updateSelectedState();

      this.#emitChange(newValue);
      return;
    }

    if (key === "dropdownValues") {
      this.#renderDropdownValues(newValue);
    }
  }

  #handleInputFocus = () => {
    this.rootElement.classList.add("is-open");
  };

  #handleInputBlur = () => {
    this.rootElement.classList.remove("is-open");
  };

  #handleInputChange = (event) => {
    const value = event.target.value.trim();
    this.value = value;
  };

  #handleDropdownMouseDown = (event) => {
    event.preventDefault();
  };

  #handleDropdownClick = (event) => {
    this.closestElement(event, '[data-role="dropdown-item"]', (element) => {
      this.value = element.dataset.value;
      this.dom.get("input").blur();
    });
  };

  /** update ui states */

  #updateInputValue() {
    const inputElement = this.dom.get("input");
    inputElement.value = this.#value ?? "";
  }

  #updateSelectedState() {
    this.#dropdownValues.forEach((value) => {
      const dropdownItemEl = this.dom.get(`dropdown-${value}`);
      dropdownItemEl.classList.toggle("is-selected", this.#value === value);
    });
  }
}

export class CompactCombobox extends Combobox {
  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "combobox combobox-compact",
    });
  }
}
