import { Elm } from "./base/elm.js";
import {
  isNullishOrEmpty,
  assertNonBlankString,
  assertFunction,
  assertPlainObjectArray,
  assertNoDuplicatePlainObjectValues,
} from "./base/assert.js";

const ROOT_CLASS = "timeline-combobox";
const TEMPLATE = `
<div>
  <input
    class="timeline-combobox-input"
    type="text"
    autocomplete="off"
    placeholder="Select or enter an option"
    data-role="input"
  />
  <div class="timeline-combobox-dropdown" data-role="dropdown"></div>
</div>
`;
const DROPDOWN_ITEM_TEMPLATE = `
<div class="timeline-combobox-item" data-role="item"></div>
`;

export class TimelineCombobox extends Elm {
  // state
  #dropdownItems = [];
  #value;
  // event
  #onChange;

  #handleDocumentClick = (event) => {
    if (!this.rootElement.contains(event.target)) {
      this.#close();
    }
  };

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });

    this.#render();
    this.#bindEvents();
  }

  // ---------------------------------------------------------------------------
  // items
  // ---------------------------------------------------------------------------

  set dropdownItems(items) {
    assertPlainObjectArray(items, "items", "text", "value");
    assertNoDuplicatePlainObjectValues(items, "value", "items");

    this.#clearDropdownItems();
    this.#dropdownItems = items.map((item) => ({ ...item }));
    this.#renderDropdownItems();
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

    this.#updateInputState();
    this.#onChange?.({
      elm: this,
      value: newValue,
    });
  }

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.dom.clear();

    const templateEl = this.resolveElement(TEMPLATE);
    const [inputEl, dropdownEl] = this.queryElement(templateEl, [
      '[data-role="input"]',
      '[data-role="dropdown"]',
    ]);
    this.dom.add("input", inputEl);
    this.dom.add("dropdown", dropdownEl);
  }

  #renderDropdownItems() {
    this.#dropdownItems.forEach((item) => {
      const { text, value } = item;
      const dropdownItemEl = this.resolveElement(DROPDOWN_ITEM_TEMPLATE);

      dropdownItemEl.textContent = text;
      dropdownItemEl.dataset.value = value;

      this.dom.add(`dropdown:${value}`, dropdownItemEl, "dropdown");
    });
  }

  #clearDropdownItems() {
    this.#dropdownItems.forEach((item) => {
      this.dom.remove(`dropdown:${item.value}`);
    });
    this.#dropdownItems = [];
  }

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateInputState() {
    const inputElement = this.dom.get("input");
    inputElement.value = this.#value ?? "";
  }

  // ---------------------------------------------------------------------------
  // events
  // ---------------------------------------------------------------------------

  set onChange(handler) {
    if (handler != null) {
      assertFunction(handler, "handler");
      this.#onChange = handler;
      return;
    }

    // handler can be null to remove the event listener
    this.#onChange = null;
  }

  #bindEvents() {
    this.dom.on("input", "focus", this.#handleTimelineComboboxFocus);
    this.dom.on("input", "change", this.#handleTimelineComboboxChange);
    this.dom.on("dropdown", "click", this.#handleDropdownClick);

    document.addEventListener("click", this.#handleDocumentClick);
  }

  #handleTimelineComboboxFocus = () => {
    this.#open();
  };

  #handleTimelineComboboxChange = (event) => {
    const value = event.target.value.trim();
    this.value = value;
  };

  #handleDropdownClick = (event) => {
    this.closestElement(event, ".timeline-combobox-item", (element) => {
      this.value = element.dataset.value;
      this.#close();
    });
  };

  #open() {
    this.rootElement.classList.add("is-open");
  }

  #close() {
    this.rootElement.classList.remove("is-open");
  }

  // override destroy method to clean up event listeners
  destroy() {
    document.removeEventListener("click", this.#handleDocumentClick);
    super.destroy();
  }
}
