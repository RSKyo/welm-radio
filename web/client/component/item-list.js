import { assertBoolean, assertValueIn } from "./base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
} from "./base/elm-helper.js";
import { ItemsElm } from "./base/items-elm.js";

const ITEM_TEMPLATE = `
<div class="item-list-item" data-role="item">
  <div class="item-list-check"  data-role="check">
    <input type="checkbox" class="item-list-checkbox" data-role="checkbox" tabindex="-1">
  </div>
  <div class="item-list-content" data-role="content">
    <span class="item-list-text" data-role="text"></span>
  </div>
</div>
`;

const itemTemplate = createElementByHTML(ITEM_TEMPLATE);

export class ItemList extends ItemsElm {
  // state
  #selectedValue = null;
  #selectedValueMode = 1;
  #checkedValue = null;
  #checkedValueMode = 2;
  #showCheckboxes = true;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "item-list",
    });

    this.#init();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("selectedValueMode", (value, assertionSubject) => {
      assertValueIn(value, [1, 2], assertionSubject);
      this.#selectedValueMode = value;
    });

    this.resolveOption("checkedValueMode", (value, assertionSubject) => {
      assertValueIn(value, [1, 2], assertionSubject);
      this.#checkedValueMode = value;
    });

    this.resolveOption("showCheckboxes", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#showCheckboxes = value;
    });
  }

  // -----------------------------------------------------------------------------
  // get/set state value
  // -----------------------------------------------------------------------------

  get selectedValueMode() {
    return this.#selectedValueMode;
  }

  get selectedValue() {
    return normalizeValue(this.#selectedValue, this.#selectedValueMode);
  }

  set selectedValue(value) {
    assertValueForMode(value, this.#selectedValueMode);
    const oldValue = this.#selectedValue;
    const newValue = normalizeValue(value, this.#selectedValueMode);

    if (isEqualValue(newValue, oldValue)) {
      return;
    }

    this.#selectedValue = newValue;

    this.#updateSelectedValueUIState();
    this.#emitSelectedValueChange(newValue);
  }

  get checkedValueMode() {
    return this.#checkedValueMode;
  }

  get checkedValue() {
    return normalizeValue(this.#checkedValue, this.#checkedValueMode);
  }

  set checkedValue(value) {
    assertValueForMode(value, this.#checkedValueMode);
    const oldValue = this.#checkedValue;
    const newValue = normalizeValue(value, this.#checkedValueMode);

    if (isEqualValue(newValue, oldValue)) {
      return;
    }

    this.#checkedValue = newValue;

    this.#updateCheckedValueUIState();
    this.#emitCheckedValueChange(newValue);
  }

  checkAll() {
    if (this.#checkedValueMode === 1) {
      throw new Error("Cannot check all items when checkedValueMode is 1.");
    }
    this.checkedValue = this.itemValues;
  }

  uncheckAll() {
    if (this.#checkedValueMode === 1) {
      throw new Error("Cannot uncheck all items when checkedValueMode is 1.");
    }
    this.checkedValue = null;
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onSelectedValueChange(handler) {
    this.handler.set("selectedValueChangeHandler", handler);
  }

  #emitSelectedValueChange(value) {
    this.handler.emit("selectedValueChangeHandler", {
      elm: this,
      item: this.getItemByValue(value, this.#selectedValueMode),
      value,
    });
  }

  set onCheckedValueChange(handler) {
    this.handler.set("checkedValueChangeHandler", handler);
  }

  #emitCheckedValueChange(value) {
    this.handler.emit("checkedValueChangeHandler", {
      elm: this,
      item: this.getItemByValue(value, this.#checkedValueMode),
      value: value,
    });
  }

  set onDoubleClick(handler) {
    this.handler.set("doubleClickHandler", handler);
  }

  #emitDoubleClick(value) {
    this.handler.emit("doubleClickHandler", {
      elm: this,
      item: this.getItemByValue(value, 1),
      value,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "click", this.#contextClickHandler, {
      selector: '[data-role="content"]',
    });

    if (this.#showCheckboxes) {
      this.event.on(this.rootElement, "click", this.#checkboxClickHandler, {
        selector: '[data-role="checkbox"]',
      });
    }

    this.event.on(this.rootElement, "dblclick", this.#itemDblclickHandler, {
      selector: '[data-role="item"]',
    });
  }

  #contextClickHandler = (event, { element }) => {
    const itemElement = element.closest('[data-role="item"]');
    const value = itemElement.dataset.value;

    if (this.#selectedValueMode === 1) {
      this.selectedValue = value;
      return;
    }

    const oldValue = this.selectedValue ?? [];
    const newValue = oldValue.includes(value)
      ? oldValue.filter((v) => v !== value)
      : [...oldValue, value];

    this.selectedValue = newValue;
  };

  #checkboxClickHandler = (event, { element }) => {
    const itemElement = element.closest('[data-role="item"]');
    const value = itemElement.dataset.value;

    if (this.#checkedValueMode === 1) {
      this.checkedValue = value;
      return;
    }

    const oldValue = this.checkedValue ?? [];
    const newValue = oldValue.includes(value)
      ? oldValue.filter((v) => v !== value)
      : [...oldValue, value];

    this.checkedValue = newValue;
  };

  #itemDblclickHandler = (event, { element }) => {
    const value = element.dataset.value;

    this.#emitDoubleClick(value);
  };

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateSelectedValueUIState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let selected = false;
      if (this.#selectedValueMode === 1) {
        selected = this.selectedValue === value;
      } else {
        selected = this.selectedValue?.includes(value) ?? false;
      }

      element.classList.toggle("is-selected", selected);
    });
  }

  #updateCheckedValueUIState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let checked = false;
      if (this.#checkedValueMode === 1) {
        checked = this.checkedValue === value;
      } else {
        checked = this.checkedValue?.includes(value) ?? false;
      }

      element.classList.toggle("is-checked", checked);

      const checkbox = element.querySelector('[data-role="checkbox"]');
      if (checkbox) {
        checkbox.checked = checked;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);
    this.#checkedValue = filterValue(this.#checkedValue, itemValues);
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);
    this.#checkedValue = filterValue(this.#checkedValue, itemValues);
  }

  // override
  createItemElement(item) {
    const value = item[this.valueField];
    const text = item[this.textField];

    const itemElement = itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text || value;

    itemElement.classList.toggle("no-check", !this.#showCheckboxes);

    return itemElement;
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedValueUIState();
    this.#updateCheckedValueUIState();
  }
}
