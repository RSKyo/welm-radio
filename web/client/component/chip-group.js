import {
  assertBoolean,
  assertPositiveInteger,
  assertValueIn,
} from "./base/assert.js";
import { createElementByHTML } from "./base/elm-helper.js";
import { ItemsElm } from "./base/items-elm.js";

const ITEM_TEMPLATE = `
<div class="chip-group-item" data-role="item">
  <span class="chip-group-text" data-role="text"></span>
</div>
`;

const ACTIONS_TEMPLATE = `
<div class="chip-group-actions" data-role="actions">
  <button type="button" class="chip-group-action" data-role="action" data-action="select-all">全选</button>
  <button type="button" class="chip-group-action" data-role="action" data-action="unselect">取消</button>
</div>
`;

const itemTemplate = createElementByHTML(ITEM_TEMPLATE);
const actionsTemplate = createElementByHTML(ACTIONS_TEMPLATE);

export class ChipGroup extends ItemsElm {
  // state
  #selectedValueMode = 2;
  #showActions = true;
  #showActionsMinCount = 3;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "chip-group",
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

    this.resolveOption("showActions", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#showActions = value;
    });

    this.resolveOption("showActionsMinCount", (value, assertionSubject) => {
      assertPositiveInteger(value, assertionSubject);
      this.#showActionsMinCount = value;
    });

    this.itemValueState.define("selectedValue", null, this.#selectedValueMode);
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

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.dom.onRootDelegate('[data-role="item"]', "click", (event, detail) => {
      const { element } = detail;
      const value = element.dataset.value;

      if (this.#selectedValueMode === 1) {
        this.selectedValue = value;
        return;
      }

      const oldValue = this.selectedValue ?? [];
      const newValue = oldValue.includes(value)
        ? oldValue.filter((v) => v !== value)
        : [...oldValue, value];

      this.selectedValue = newValue;
    });

    this.dom.onRootDelegate('[data-action="select-all"]', "click", () => {
      this.selectedValue = this.itemValues;
    });

    this.dom.onRootDelegate('[data-action="unselect"]', "click", () => {
      this.selectedValue = null;
    });
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

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterItemValueStateSet({ key, newValue }) {
    if (key === "selectedValue") {
      this.#updateSelectedValueUIState();
      this.#emitSelectedValueChange(newValue);
    }
  }

  // override
  renderItem(item) {
    const value = item[this.valueField];
    const text = item[this.textField];

    const itemElement = itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text || value;

    this.dom.add(value, itemElement);
  }

  // override
  afterRenderItems(items) {
    if (
      this.#selectedValueMode === 2 &&
      this.#showActions &&
      items.length >= this.#showActionsMinCount
    ) {
      const actionsElement = actionsTemplate.cloneNode(true);
      this.dom.add("__actions__", actionsElement);
    }

    this.#updateSelectedValueUIState();
  }

  // override
  renderUpdatedItem(updatedItem) {
    const value = updatedItem[this.valueField];
    const text = updatedItem[this.textField];

    const itemElement = this.dom.get(value);

    itemElement.querySelector("[data-role='text']").textContent = text || value;
  }
}

// ---------------------------------------------------------------------------
// SoloChipGroup
// ---------------------------------------------------------------------------
export class SoloChipGroup extends ChipGroup {
  constructor(root, options = {}) {
    super(root, {
      ...options,
      selectedValueMode: 1,
    });
  }
}

// ---------------------------------------------------------------------------
// MultiChipGroup
// ---------------------------------------------------------------------------
export class MultiChipGroup extends ChipGroup {
  constructor(root, options = {}) {
    super(root, {
      ...options,
      selectedValueMode: 2,
    });
  }
}
