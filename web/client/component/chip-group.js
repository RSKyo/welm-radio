import { ItemsElm } from "./base/items-elm.js";
import {
  isNullishOrEmpty,
  assertBoolean,
  assertNonBlankString,
  assertFunction,
  assertPositiveInteger,
  assertValueIn,
  assertElementMatches,
  assertElementContains,
} from "./base/assert.js";

const ROOT_CLASS = "chip-group";
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

export class ChipGroup extends ItemsElm {
  // templates
  #itemTemplate;
  #actionsTemplate;
  // state
  #mode = "multiple";
  #selectedValue;
  #selectedValueMode = 2;
  #showActions = true;
  #showActionsMinCount = 3;
  // event
  #onSelectedChange;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });

    this.#initOptions(options);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // options
  // -----------------------------------------------------------------------------

  #initOptions(options) {
    this.resolveOption("mode", (value, assertionSubject) => {
      assertValueIn(value, ["multiple", "single"], assertionSubject);
      this.#mode = value;
      this.#selectedValueMode = this.#mode === "multiple" ? 2 : 1;
    });

    this.resolveOption("showActions", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#showActions = value;
    });

    this.resolveOption("showActionsMinCount", (value, assertionSubject) => {
      assertPositiveInteger(value, assertionSubject);
      this.#showActionsMinCount = value;
    });

    this.resolveOption(
      "itemTemplate",
      (value, assertionSubject) => {
        this.#itemTemplate = this.resolveElement(value, assertionSubject, {
          matches: ['[data-role="item"]'],
          contains: ['[data-role="text"]'],
        });
      },
      () => {
        this.#itemTemplate = this.resolveElement(
          ITEM_TEMPLATE,
          "ITEM_TEMPLATE",
        );
      },
    );

    this.resolveOption(
      "actionsTemplate",
      (value, assertionSubject) => {
        this.#actionsTemplate = this.resolveElement(value, assertionSubject, {
          matches: ['[data-role="actions"]'],
          contains: [
            '[data-role="action"][data-action="select-all"]',
            '[data-role="action"][data-action="unselect"]',
          ],
        });
      },
      () => {
        this.#actionsTemplate = this.resolveElement(
          ACTIONS_TEMPLATE,
          "ACTIONS_TEMPLATE",
        );
      },
    );
  }

  // -----------------------------------------------------------------------------
  // selected value
  // -----------------------------------------------------------------------------

  #assertMultipleMode() {
    if (this.#selectedValueMode !== 2) {
      throw new Error("This operation is only available in multiple mode");
    }
  }

  get selectedValue() {
    if (isNullishOrEmpty(this.#selectedValue)) {
      return null;
    }
    return this.#selectedValueMode === 2
      ? [...this.#selectedValue]
      : this.#selectedValue;
  }

  set selectedValue(value) {
    this.assertModeValue(value, this.#selectedValueMode);

    const oldValue = this.#selectedValue;
    if (isNullishOrEmpty(value)) {
      this.#selectedValue = null;
    } else {
      this.assertItemValueExists(value);
      this.#selectedValue = this.#selectedValueMode === 2 ? [...value] : value;
    }

    const newValue = this.#selectedValue;
    if (!this.isEqualValue(newValue, oldValue)) {
      this.#updateSelectedState();

      this.#onSelectedChange?.({
        elm: this,
        value: newValue,
      });
    }
  }

  selectAll() {
    this.#assertMultipleMode();
    this.selectedValue = this.itemValues;
  }

  unselect() {
    this.#assertMultipleMode();
    this.selectedValue = null;
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

  set onSelectedChange(handler) {
    if (handler != null) {
      assertFunction(handler, "handler");
      this.#onSelectedChange = handler;
      return;
    }

    // handler can be null to remove the event listener
    this.#onSelectedChange = null;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.dom.onRoot("click", this.#handleRootClick);
  }

  #handleRootClick = (event) => {
    this.closestElement(event, '[data-role="item"]', (element) => {
      const value = element.dataset.value;
      if (this.#selectedValueMode === 1) {
        this.selectedValue = value;
        return;
      }

      const oldValue = this.#selectedValue ?? [];
      const newValue = oldValue.includes(value)
        ? oldValue.filter((v) => v !== value)
        : [...oldValue, value];

      this.selectedValue = newValue;
    });

    this.closestElement(event, '[data-action="select-all"]', () => {
      this.selectAll();
    });

    this.closestElement(event, '[data-action="unselect"]', () => {
      this.unselect();
    });
  };

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateSelectedState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let selected = false;
      if (this.#selectedValueMode === 1) {
        selected = this.#selectedValue === value;
      } else if (this.#selectedValueMode === 2) {
        selected = this.#selectedValue?.includes(value) ?? false;
      }

      element.classList.toggle("is-selected", selected);
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    this.#selectedValue = this.filterItemValue(this.#selectedValue);
  }

  // override
  afterRenderItems(items) {
    if (
      this.#selectedValueMode === 2 &&
      this.#showActions &&
      items.length >= this.#showActionsMinCount
    ) {
      const actionsElement = this.#actionsTemplate.cloneNode(true);
      this.dom.add("__actions__", actionsElement);
    }

    this.#updateSelectedState();
  }

  // override
  renderItem(item) {
    const value = item[this.valueField];
    const text = item[this.textField];
    const tooltip = item[this.tooltipField];

    const itemElement = this.#itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text || value;
    itemElement.title = tooltip || text || "";

    this.dom.add(value, itemElement);
  }

  // override
  afterRemoveItem(removedItem) {
    this.#selectedValue = this.filterItemValue(this.#selectedValue);
  }
}

// ---------------------------------------------------------------------------
// SoloChipGroup
// ---------------------------------------------------------------------------
export class SoloChipGroup extends ChipGroup {
  constructor(root, options = {}) {
    super(root, {
      ...options,
      mode: "single",
    });
  }

  init(root, options = {}) {
    super.init(root, {
      ...options,
      mode: "single",
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
      mode: "multiple",
    });
  }

  init(root, options = {}) {
    super.init(root, {
      ...options,
      mode: "multiple",
    });
  }
}
