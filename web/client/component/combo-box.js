import { Elm } from "./base/elm.js";
import {
  isNullishOrEmpty,
  assertBoolean,
  assertNonBlankString,
  assertNonEmptyNonBlankStringArray,
  assertFunction,
} from "./base/assert.js";

const ROOT_CLASS = "combo-box";

const COMBOBOX_TEMPLATE = `
<div class="combo-box-input-wrap">
  <input
    class="combo-box-input"
    data-role="combo-box-input"
    type="text"
    autocomplete="off"
  >

  <button
    class="combo-box-toggle"
    data-role="combo-box-toggle"
    type="button"
    tabindex="-1"
  >
    ▾
  </button>
</div>
`;

const DROPDOWN_TEMPLATE = `
<div class="combo-box-dropdown" data-role="combo-box-dropdown"></div>
`;

const DROPDOWN_ITEM_TEMPLATE = `
<div class="combo-box-item" data-role="combo-box-item"></div>
`;

export class ComboBox extends Elm {
  // state
  #items = [];
  #value;
  #showDropdownButton = true;
  // event
  #onChange;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });

    if (options.showDropdownButton != null) {
      assertBoolean(options.showDropdownButton, "options.showDropdownButton");
      this.#showDropdownButton = options.showDropdownButton;
    }

    this.#render();
    this.#bindEvents();
  }

  // ---------------------------------------------------------------------------
  // items
  // ---------------------------------------------------------------------------

  get items() {
    return [...this.#items];
  }

  set items(items) {
    assertNonEmptyNonBlankStringArray(items, "items");

    this.#items = [...items];

    this.#renderItems();
  }

  // ---------------------------------------------------------------------------
  // value
  // ---------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  set value(value) {
    assertNonBlankString(value, "value");

    this.#setValue(value);
  }

  #setValue(value) {
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
      this.#onChange?.(newValue);
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

  // ---------------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------------

  #render() {
    this.dom.clear();

    this.rootElement.classList.toggle("no-toggle", !this.#showDropdownButton);

    const comboboxEl = this.createElementByHTML(COMBOBOX_TEMPLATE);
    this.dom.add("combobox", comboboxEl);
    const inputEl = comboboxEl.querySelector('[data-role="combo-box-input"]');
    inputEl.value = this.#value ?? "";

    const dropdownEl = this.createElementByHTML(DROPDOWN_TEMPLATE);
    this.dom.add("dropdown", dropdownEl);
    this.#renderItems();
  }

  #renderItems() {
    const dropdownElement = this.dom.get("dropdown");
    dropdownElement.replaceChildren();

    let index = 0;
    for (const item of this.#items) {
      const itemEl = this.createElementByHTML(DROPDOWN_ITEM_TEMPLATE);

      itemEl.textContent = item;
      itemEl.dataset.value = item;

      this.dom.add(`dropdown${index}`, itemEl, "dropdown");
      index++;
    }
  }

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateInputState() {
    const inputElement = this.dom.get(
      "combobox",
      '[data-role="combo-box-input"]',
    );
    inputElement.value = this.#value;
  }

  // ---------------------------------------------------------------------------
  // bind events
  // ---------------------------------------------------------------------------

  #bindEvents() {
    this.dom.on(
      "combobox",
      "focus",
      this.#comboBoxInputFocus,
      '[data-role="combo-box-input"]',
    );

    this.dom.on(
      "combobox",
      "change",
      this.#comboBoxInputChange,
      '[data-role="combo-box-input"]',
    );

    

    this.dom.on(
      "combobox",
      "click",
      this.#comboBoxToggle,
      '[data-role="combo-box-toggle"]',
    );

    const dropdownElement = this.dom.get(
      "combobox",
      '[data-role="combo-box-dropdown"]',
    );

    this.dom.on("dropdown", "click", this.#dropdownClick);

    document.addEventListener("click", (event) => {
      if (!this.rootElement.contains(event.target)) {
        this.#close();
      }
    });
  }

   #comboBoxInputFocus = (event) => {
    this.#open();
  };

  #comboBoxInputChange = (event) => {
    const value = event.target.value.trim();
    this.#setValue(value);
  };

 

  #comboBoxToggle = () => {
    this.#toggle();
  };

  #dropdownClick = (event, { targetClosest }) => {
    targetClosest('[data-role="combo-box-item"]', ({ target }) => {
      this.#setValue(target.dataset.value, true);
      this.#close();
    });
  };

  #open() {
    this.rootElement.classList.add("is-open");
  }

  #close() {
    this.rootElement.classList.remove("is-open");
  }

  #toggle() {
    this.rootElement.classList.toggle("is-open");
  }
}
