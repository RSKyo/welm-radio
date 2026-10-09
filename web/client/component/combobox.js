import { Elm } from "./base/elm.js";
import {
  createElementByHTML,
  isEqualValue,
  getBySelector,
} from "./base/helper.js";
import {
  assertString,
  assertNonBlankString,
  assertArray,
  assertPlainObjectArray,
  assertNoDuplicatePlainObjectValues,
} from "./base/assert.js";

const MAIN_TEMPLATE = `
<div class="combobox-main" data-role="combobox-main">
  <input
    class="combobox-input"
    type="text"
    autocomplete="off"
    placeholder="Select or enter an option"
    data-role="combobox-input"
  />
  <div
    class="combobox-dropdown"
    data-role="combobox-dropdown"
  ></div>
</div>
`;

const DROPDOWN_ITEM_TEMPLATE = `
<div
  class="combobox-item"
  data-role="combobox-item"
></div>
`;

const mainTemplate = createElementByHTML(MAIN_TEMPLATE);
const dropdownItemTemplate = createElementByHTML(DROPDOWN_ITEM_TEMPLATE);

export class Combobox extends Elm {
  // state(read-only)
  #items = [];

  // state(read-write)
  #text = "";
  #value = null;

  // element
  #inputEl = null;
  #dropdownEl = null;

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
    this.resolveOption(
      "items",
      (value, assertionSubject) => {
        assertPlainObjectArray(value, assertionSubject, "text", "value");
        assertNoDuplicatePlainObjectValues(value, "text", assertionSubject);
        assertNoDuplicatePlainObjectValues(value, "value", assertionSubject);
        this.#items = value.map((item) => ({ ...item }));
      },
      true,
    );

    this.resolveOption("text", (value, assertionSubject) => {
      assertString(value, assertionSubject);
      this.#text = value;
      this.#value = this.#resolveValue(value);
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get items() {
    return this.#items.map((item) => ({ ...item }));
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get text() {
    return this.#text;
  }

  set text(value) {
    assertString(value, "text");
    this.#setText(value);
  }

  #setText(text, updateInput = true) {
    const value = this.#resolveValue(text);

    if (text === this.#text && isEqualValue(value, this.#value)) {
      return;
    }

    this.#text = text;
    this.#value = value;

    if (updateInput) {
      this.#updateInputValue();
    }

    this.#updateSelectedState();
    this.#emitChange();
  }

  get value() {
    return this.#value;
  }

  #resolveValue(text) {
    const item = this.#items.find((item) => item.text === text);

    return item?.value ?? text;
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
      text: this.#text,
      value: this.#value,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.#inputEl, "focus", this.#inputFocusHandler);

    this.event.on(this.#inputEl, "blur", this.#inputBlurHandler);

    this.event.on(this.#inputEl, "input", this.#inputInputHandler);

    this.event.on(
      this.#dropdownEl,
      "mousedown",
      this.#dropdownMouseDownHandler,
    );

    this.event.on(this.#dropdownEl, "click", this.#dropdownClickHandler, {
      selector: '[data-role="combobox-item"]',
    });
  }

  #inputFocusHandler = () => {
    this.rootElement.classList.add("is-open");
  };

  #inputBlurHandler = () => {
    this.rootElement.classList.remove("is-open");
  };

  #inputInputHandler = (event) => {
    this.#setText(event.target.value, false);
  };

  #dropdownMouseDownHandler = (event) => {
    event.preventDefault();
  };

  #dropdownClickHandler = (event, { element }) => {
    const index = Number(element.dataset.index);
    const item = this.#items[index];

    if (item == null) {
      return;
    }

    this.#setText(item.text);
    this.#inputEl.blur();
  };

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateInputValue() {
    this.#inputEl.value = this.#text;
  }

  #updateSelectedState() {
    for (const itemEl of this.#dropdownEl.children) {
      const index = Number(itemEl.dataset.index);
      const item = this.#items[index];

      itemEl.classList.toggle("is-selected", item?.text === this.#text);
    }
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  #render() {
    const mainEl = mainTemplate.cloneNode(true);

    const [inputEl, dropdownEl] = getBySelector(
      mainEl,
      '[data-role="combobox-input"]',
      '[data-role="combobox-dropdown"]',
    );

    this.#inputEl = inputEl;
    this.#dropdownEl = dropdownEl;

    this.#renderItems();

    this.rootElement.append(mainEl);

    this.#updateInputValue();
    this.#updateSelectedState();
  }

  #renderItems() {
    for (let index = 0; index < this.#items.length; index++) {
      const item = this.#items[index];
      const itemEl = dropdownItemTemplate.cloneNode(true);

      itemEl.textContent = item.text;
      itemEl.dataset.index = index;

      this.#dropdownEl.append(itemEl);
    }
  }
}
