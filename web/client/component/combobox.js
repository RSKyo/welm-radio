import { Elm } from "./base/elm.js";
import {
  isNullishOrEmpty,
  assertNonBlankString,
  assertNonBlankStringArray,
  assertNoDuplicateValues,
} from "./base/assert.js";

const TEMPLATE = `
<div>
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

export class Combobox extends Elm {
  // state
  #value;
  #dropdownValues = [];

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "combobox",
    });

    this.#render();
    this.#bindEvents();
  }

  // ---------------------------------------------------------------------------
  // value
  // ---------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  set value(value) {
    const oldValue = this.#value;
    if (isNullishOrEmpty(value)) {
      this.#value = null;
    } else {
      assertNonBlankString(value, "value");
      this.#value = value;
    }

    const newValue = this.#value;
    if (oldValue === newValue) {
      return;
    }

    this.#updateInputValue();
    this.#updateSelectedState();

    this.emit("change", {
      value: newValue,
    });
  }

  // ---------------------------------------------------------------------------
  // dropdown values
  // ---------------------------------------------------------------------------

  set dropdownValues(values) {
    assertNonBlankStringArray(values, "values");
    assertNoDuplicateValues(values, "values");

    this.#dropdownValues = [...values];
    this.#renderDropdownValues();
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.dom.clear();

    const templateEl = this.resolveElement(TEMPLATE);
    const [inputEl, dropdownEl] = this.queryElements(
      templateEl,
      '[data-role="input"]',
      '[data-role="dropdown"]',
    );
    this.dom.add("input", inputEl);
    this.dom.add("dropdown", dropdownEl);
  }

  #renderDropdownValues() {
    this.dom.clear("dropdown");

    for (const value of this.#dropdownValues) {
      const dropdownItemEl = this.resolveElement(DROPDOWN_ITEM_TEMPLATE);

      dropdownItemEl.textContent = value;
      dropdownItemEl.dataset.value = value;

      this.dom.add(`dropdown-${value}`, dropdownItemEl, "dropdown");
    }
  }

  // ---------------------------------------------------------------------------
  // events
  // ---------------------------------------------------------------------------

  /** event handlers */

  set onChange(handler) {
    this.setHandler("change", handler);
  }

  /** bind events */

  #bindEvents() {
    this.dom.on("input", "focus", this.#handleInputFocus);
    this.dom.on("input", "blur", this.#handleInputBlur);
    this.dom.on("input", "change", this.#handleInputChange);

    this.dom.on("dropdown", "mousedown", this.#handleDropdownMouseDown);
    this.dom.on("dropdown", "click", this.#handleDropdownClick);
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
      rootClass: "combobox combobox-compact",
    });
  }
}
