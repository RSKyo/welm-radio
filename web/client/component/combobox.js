import { Elm } from "./base/elm.js";
import {
  createElementByHTML,
  isEqualValue,
  getBySelector,
} from "./base/elm-helper.js";
import { assertString, assertNonBlankStringArray } from "./base/assert.js";

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
  #value = "";
  #dropdownValues = [];

  constructor(root, options = {}) {
    super(root, {
      defaultRootClass: "combobox",
      ...options,
    });

    this.#render();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // get/set state value
  // -----------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  set value(value) {
    assertString(value);
    this.#setValue(value);
  }

  #setValue(value) {
    const oldValue = this.#value;
    const newValue = value;

    if (isEqualValue(oldValue, newValue)) {
      return;
    }

    this.#value = newValue;

    this.#updateInputValue();
    this.#updateSelectedState();

    this.#emitChange(newValue);
  }

  get dropdownValues() {
    return [...this.#dropdownValues];
  }

  set dropdownValues(values) {
    assertNonBlankStringArray(values);
    this.#setDropdownValues(values);
  }

  #setDropdownValues(values) {
    const oldValue = this.#dropdownValues;
    const newValue = [...values];

    if (isEqualValue(oldValue, newValue)) {
      return;
    }

    this.#dropdownValues = newValue;

    this.#renderDropdownValues(newValue);
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onChange(handler) {
    this.handler.set("changeHandler", handler);
  }

  #emitChange(value) {
    this.handler.emit("changeHandler", {
      elm: this,
      value,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    const [inputEl, dropdownEl] = getBySelector(
      this.rootElement,
      '[data-role="input"]',
      '[data-role="dropdown"]',
    );

    this.event.on(inputEl, "focus", this.#inputFocusHandler);
    this.event.on(inputEl, "blur", this.#inputBlurHandler);
    this.event.on(inputEl, "change", this.#inputChangeHandler);

    this.event.on(dropdownEl, "mousedown", this.#dropdownMouseDownHandler);
    this.event.on(dropdownEl, "click", this.#dropdownClickHandler, {
      selector: '[data-role="dropdown-item"]',
    });
  }

  #inputFocusHandler = () => {
    this.rootElement.classList.add("is-open");
  };

  #inputBlurHandler = () => {
    this.rootElement.classList.remove("is-open");
  };

  #inputChangeHandler = (event) => {
    const value = event.target.value.trim();
    this.#setValue(value);
  };

  #dropdownMouseDownHandler = (event) => {
    event.preventDefault();
  };

  #dropdownClickHandler = (event, { element }) => {
    const value = element.dataset.value;
    this.#setValue(value);

    const inputEl = getBySelector(this.rootElement, '[data-role="input"]');
    inputEl.blur();
  };

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateInputValue() {
    const inputEl = getBySelector(this.rootElement, '[data-role="input"]');
    inputEl.value = this.#value ?? "";
  }

  #updateSelectedState() {
    const dropdownEl = getBySelector(
      this.rootElement,
      '[data-role="dropdown"]',
    );

    for (const itemEl of dropdownEl.children) {
      const value = itemEl.dataset.value;
      itemEl.classList.toggle("is-selected", this.#value === value);
    }
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.rootElement.append(mainTemplate.cloneNode(true));
  }

  #renderDropdownValues(values) {
    const dropdownEl = getBySelector(
      this.rootElement,
      '[data-role="dropdown"]',
    );

    dropdownEl.replaceChildren();

    for (const value of values) {
      const dropdownItemEl = dropdownItemTemplate.cloneNode(true);

      dropdownItemEl.textContent = value;
      dropdownItemEl.dataset.value = value;

      dropdownEl.append(dropdownItemEl);
    }
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
