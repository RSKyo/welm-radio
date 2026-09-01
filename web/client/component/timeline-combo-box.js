import { Elm } from "./base/elm.js";
import {
  assertBoolean,
  assertNonBlankString,
  assertNonEmptyNonBlankStringArray,
  assertFunction,
  isNullishOrEmpty,
} from "./base/assert.js";

const ROOT_CLASS = "timeline-combo-box";

const INPUT_TEMPLATE = `
<input
    class="timeline-combo-box-input"
    type="text"
    autocomplete="off"
    placeholder="Select or enter an option"
  />
`;
const DROPDOWN_TEMPLATE = `
<div class="timeline-combo-box-dropdown"></div>
`;
const DROPDOWN_ITEM_TEMPLATE = `
<div class="timeline-combo-box-item"></div>
`;

export class TimelineComboBox extends Elm {
  // state
  #items = [];
  #value;
  // event
  #onChange;

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

    const inputEl = this.createElementByHTML(INPUT_TEMPLATE);
    this.dom.add("input", inputEl);

    const dropdownEl = this.createElementByHTML(DROPDOWN_TEMPLATE);
    this.dom.add("dropdown", dropdownEl);
    this.#renderItems();

    this.#updateInputState();
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
    const inputElement = this.dom.get("input");
    inputElement.value = this.#value ?? "";
  }

  // ---------------------------------------------------------------------------
  // bind events
  // ---------------------------------------------------------------------------

  #bindEvents() {
    this.dom.on("input", "focus", this.#timelineComoboxFocus);
    this.dom.on("input", "change", this.#timelineComoboxChange);

    

    this.dom.on("dropdown", "click", this.#dropdownClick);

    document.addEventListener("click", (event) => {
      if (!this.rootElement.contains(event.target)) {
        this.#close();
      }
    });
  }

  #timelineComoboxFocus = (event) => {
    this.#open();
  };

  #timelineComoboxChange = (event) => {
    const value = event.target.value.trim();
    this.#setValue(value);
  };

  

  #dropdownClick = (event, { targetClosest }) => {
    targetClosest(".timeline-combo-box-item", ({ target }) => {
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

  
}
