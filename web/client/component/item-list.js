import { assertBoolean, assertValueIn } from "./base/assert.js";
import { createElementByHTML } from "./base/elm-helper.js";
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
  #selectedValueMode = 1;
  #checkedValueMode = 2;
  #showCheckboxes = true;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "item-list",
    });

    this.#init(options);
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

    this.itemValueState.define("selectedValue", null, this.#selectedValueMode);
    this.itemValueState.define("checkedValue", null, this.#checkedValueMode);
  }

  // -----------------------------------------------------------------------------
  // get/set state value
  // -----------------------------------------------------------------------------

  get selectedValue() {
    return this.itemValueState.getValue("selectedValue");
  }

  set selectedValue(value) {
    this.itemValueState.setValue("selectedValue", value);
  }

  get checkedValue() {
    return this.itemValueState.getValue("checkedValue");
  }

  set checkedValue(value) {
    this.itemValueState.setValue("checkedValue", value);
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
    this.handlerRegistry.set("onSelectedValueChange", handler);
  }

  #emitSelectedValueChange(newValue) {
    this.handlerRegistry.emit("onSelectedValueChange", {
      elm: this,
      item: this.getItemByValue(newValue, this.#selectedValueMode),
      value: newValue,
    });
  }

  set onCheckedValueChange(handler) {
    this.handlerRegistry.set("onCheckedValueChange", handler);
  }

  #emitCheckedValueChange(newValue) {
    const item =
      this.#checkedValueMode === 1
        ? this.getItemByValue(newValue, this.#checkedValueMode)
        : newValue.map((v) => this.getItemByValue(v, this.#checkedValueMode));

    this.handlerRegistry.emit("onCheckedValueChange", {
      elm: this,
      item,
      value: newValue,
    });
  }

  set onDoubleClick(handler) {
    this.handlerRegistry.set("onDoubleClick", handler);
  }

  #emitDoubleClick(state) {
    const { newValue } = state;

    this.handlerRegistry.emit("onDoubleClick", {
      elm: this,
      value: newValue,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.dom.onRootDelegate(
      '[data-role="content"]',
      "click",
      (event, detail) => {
        const { element } = detail;
        const itemElement = element.closest('[data-role="item"]');
        const value = itemElement?.dataset.value;

        if (this.#selectedValueMode === 1) {
          this.selectedValue = value;
          return;
        }

        const oldValue = this.selectedValue ?? [];
        const newValue = oldValue.includes(value)
          ? oldValue.filter((v) => v !== value)
          : [...oldValue, value];

        this.selectedValue = newValue;
      },
    );

    if (this.#showCheckboxes) {
      this.dom.onRootDelegate(
        '[data-role="checkbox"]',
        "click",
        (event, detail) => {
          const { element } = detail;
          const itemElement = element.closest('[data-role="item"]');
          const value = itemElement?.dataset.value;

          if (this.#checkedValueMode === 1) {
            this.checkedValue = value;
            return;
          }

          const oldValue = this.checkedValue ?? [];
          const newValue = oldValue.includes(value)
            ? oldValue.filter((v) => v !== value)
            : [...oldValue, value];

          this.checkedValue = newValue;
        },
      );
    }

    this.dom.onRootDelegate(
      '[data-role="item"]',
      "dblclick",
      (event, detail) => {
        const { element } = detail;
        const value = element.dataset.value;

        this.#emitDoubleClick(value);
      },
    );
  }

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
      } else if (this.#checkedValueMode === 2) {
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
  afterItemValueStateSet({ key, newValue }) {
    if (key === "selectedValue") {
      this.#updateSelectedValueUIState();
      this.#emitSelectedValueChange(newValue);
      return;
    }

    if (key === "checkedValue") {
      this.#updateCheckedValueUIState();
      this.#emitCheckedValueChange(newValue);
    }
  }

  // override
  renderItem(item) {
    const value = item[this.valueField];
    const text = item[this.textField];

    const itemElement = itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text || value;

    itemElement.classList.toggle("no-check", !this.#showCheckboxes);

    this.dom.add(value, itemElement);
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedValueUIState();
    this.#updateCheckedValueUIState();
  }

  // override
  renderUpdatedItem(updatedItem) {
    const value = updatedItem[this.valueField];
    const text = updatedItem[this.textField];

    const itemElement = this.dom.get(value);

    itemElement.querySelector("[data-role='text']").textContent = text || value;
  }
}
