import {
  assertBoolean,
  assertPositiveInteger,
  assertValueIn,
} from "./base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
} from "./base/elm-helper.js";
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
  #selectedValue = null;
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

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "click", this.#itemClickHandler, {
      selector: '[data-role="item"]',
    });

    this.event.on(this.rootElement, "click", this.#selectAllClickHandler, {
      selector: '[data-action="select-all"]',
    });

    this.event.on(this.rootElement, "click", this.#unselectClickHandler, {
      selector: '[data-action="unselect"]',
    });
  }

  #itemClickHandler = (event, { element }) => {
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
  };

  #selectAllClickHandler = () => {
    this.selectedValue = this.itemValues;
  };

  #unselectClickHandler = () => {
    this.selectedValue = null;
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

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    this.#selectedValue = filterValue(this.#selectedValue, this.itemValues);
  }

  // override
  afterRemoveItem(removedItem) {
    this.#selectedValue = filterValue(this.#selectedValue, this.itemValues);
  }

  // override
  createItemElement(item) {
    const value = item[this.valueField];
    const text = item[this.textField];

    const itemElement = itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text || value;

    return itemElement;
  }

  // override
  afterRenderItems(items) {
    if (
      this.#selectedValueMode === 2 &&
      this.#showActions &&
      items.length >= this.#showActionsMinCount
    ) {
      const actionsElement = actionsTemplate.cloneNode(true);
      this.rootElement.append(actionsElement);
    }

    this.#updateSelectedValueUIState();
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
