import { ItemsElm } from "./base/items-elm.js";
import {
  assertBoolean,
  assertPositiveInteger,
  assertValueIn,
} from "./base/assert.js";

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
  #selectedValueMode = 2;
  #showActions = true;
  #showActionsMinCount = 3;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "chip-group",
    });

    this.#init();
    this.#initTemplate();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // options
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("mode", (value, assertionSubject) => {
      assertValueIn(value, ["multiple", "single"], assertionSubject);
      this.#selectedValueMode = value === "multiple" ? 2 : 1;
    });

    this.resolveOption("showActions", (value, assertionSubject) => {
      assertBoolean(value, assertionSubject);
      this.#showActions = value;
    });

    this.resolveOption("showActionsMinCount", (value, assertionSubject) => {
      assertPositiveInteger(value, assertionSubject);
      this.#showActionsMinCount = value;
    });

    this.initValueState("selectedValue", null, this.#selectedValueMode);
  }

  #initTemplate() {
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

  get selectedValue() {
    return this.getStateValue("selectedValue");
  }

  set selectedValue(value) {
    this.setStateValue("selectedValue", value);
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

  set onSelectedChange(handler) {
    this.setHandler("onSelectedChange", handler);
  }

  triggerSelectedChange(value) {
    this.emit("onSelectedChange", {
      value,
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

  #updateUISelectedState() {
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

  // Override this method to perform actions after the state value has been set.
  afterSetStateValue({ key, newValue }) {
    if (key === "selectedValue") {
      this.#updateUISelectedState();
      this.triggerSelectedChange(newValue);
    }
  }

  // override
  renderItem(item) {
    const value = item[this.valueField];
    const text = item[this.textField];

    const itemElement = this.#itemTemplate.cloneNode(true);
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
      const actionsElement = this.#actionsTemplate.cloneNode(true);
      this.dom.add("__actions__", actionsElement);
    }

    this.#updateUISelectedState();
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
}
