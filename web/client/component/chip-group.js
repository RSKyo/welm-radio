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

    if (options.mode != null) {
      assertValueIn(options.mode, ["multiple", "single"], "options.mode");

      this.#mode = options.mode;
      this.#selectedValueMode = this.#mode === "multiple" ? 2 : 1;
    }

    if (options.showActions != null) {
      assertBoolean(options.showActions, "options.showActions");
      this.#showActions = options.showActions;
    }

    if (options.showActionsMinCount != null) {
      assertPositiveInteger(
        options.showActionsMinCount,
        "options.showActionsMinCount",
      );
      this.#showActionsMinCount = options.showActionsMinCount;
    }

    this.#initItemTemplate(options.itemTemplate);
    this.#initActionsTemplate(options.actionsTemplate);

    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // templates
  // -----------------------------------------------------------------------------

  #initItemTemplate(target) {
    if (target == null) {
      this.#itemTemplate = this.createElementByHTML(
        ITEM_TEMPLATE,
        "ITEM_TEMPLATE",
      );
      return;
    }

    const assertionSubject = "options.itemTemplate";
    assertNonBlankString(target, assertionSubject);
    const itemTemplate = this.resolveElement(target, assertionSubject);
    assertElementMatches(itemTemplate, '[data-role="item"]', assertionSubject);
    assertElementContains(itemTemplate, '[data-role="text"]', assertionSubject);

    this.#itemTemplate = itemTemplate;
  }

  #initActionsTemplate(target) {
    if (target == null) {
      this.#actionsTemplate = this.createElementByHTML(
        ACTIONS_TEMPLATE,
        "ACTIONS_TEMPLATE",
      );
      return;
    }

    const assertionSubject = "options.actionsTemplate";
    assertNonBlankString(target, assertionSubject);
    const actionsTemplate = this.resolveElement(target, assertionSubject);
    assertElementMatches(actionsTemplate, '[data-role="actions"]', assertionSubject);
    assertElementContains(
      actionsTemplate,
      '[data-role="action"][data-action="select-all"]',
      assertionSubject,
    );
    assertElementContains(
      actionsTemplate,
      '[data-role="action"][data-action="unselect"]',
      assertionSubject,
    );

    this.#actionsTemplate = actionsTemplate;
  }

  // -----------------------------------------------------------------------------
  // selected value
  // -----------------------------------------------------------------------------

  #assertMultipleMode() {
    if (this.#selectedValueMode !== 2) {
      throw new Error("This operation is only available in multiple mode");
    }
  }

  getSelectedValue() {
    if (isNullishOrEmpty(this.#selectedValue)) {
      return null;
    }
    return this.#selectedValueMode === 2
      ? [...this.#selectedValue]
      : this.#selectedValue;
  }

  setSelectedValue(value) {
    this.validateValueByMode(value, this.#selectedValueMode);

    const oldValue = this.#selectedValue;
    if (isNullishOrEmpty(value)) {
      this.#selectedValue = null;
    } else {
      this.validateValueExists(value);
      this.#selectedValue = this.#selectedValueMode === 2 ? [...value] : value;
    }

    const newValue = this.#selectedValue;
    if (!this.isEqualValue(newValue, oldValue)) {
      this.#updateSelectedState();

      this.#onSelectedChange?.({
        value: this.getSelectedValue(),
        item: this.getItem(newValue),
      });
    }
  }

  selectAll() {
    this.#assertMultipleMode();
    this.setSelectedValue(this.itemValues);
  }

  unselect() {
    this.#assertMultipleMode();
    this.setSelectedValue(null);
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

  #handleRootClick = (event, { targetClosest }) => {
    targetClosest('[data-role="item"]', ({ target }) => {
      const value = target.dataset.value;
      if (this.#selectedValueMode === 1) {
        this.setSelectedValue(value);
        return;
      }

      const oldValue = this.#selectedValue ?? [];
      const newValue = oldValue.includes(value)
        ? oldValue.filter((v) => v !== value)
        : [...oldValue, value];

      this.setSelectedValue(newValue);
    });

    targetClosest("[data-action]", ({ target }) => {
      if (target.dataset.action === "select-all") {
        this.selectAll();
      } else if (target.dataset.action === "unselect") {
        this.unselect();
      }
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
  afterRender(items) {
    if (
      this.#selectedValueMode === 2 &&
      this.#showActions &&
      items.length >= this.#showActionsMinCount
    ) {
      const actionsElement = this.#actionsTemplate.cloneNode(true);
      this.dom.add("__actions__", actionsElement);
    }
  }

  // Override
  onItemsChange(items) {
    this.#selectedValue = this.filterExistingValue(this.#selectedValue);
  }

  // override
  afterRender(items) {
    this.#updateSelectedState();
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
