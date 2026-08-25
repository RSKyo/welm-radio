import { ItemsElm } from "./base/items-elm.js";
import {
  isNullishOrEmpty,
  assertBoolean,
  assertNonBlankString,
  assertFunction,
  assertPositiveInteger,
  assertValueIn,
} from "./base/assert.js";

const ROOT_CLASS = "chip-group";
const DEFAULT_MODE = "multiple";
const DEFAULT_SELECTED_VALUE_MODE = 2;
const DEFAULT_SHOW_ACTIONS = true;
const DEFAULT_SHOW_ACTIONS_MIN_COUNT = 3;
const DEFAULT_ITEM_TEMPLATE_HTML = `
<div class="chip-group-item" data-role="item">
  <span class="chip-group-text" data-role="text"></span>
</div>
`;
const DEFAULT_ACTIONS_TEMPLATE_HTML = `
<div class="chip-group-actions" data-role="actions">
  <button type="button" class="chip-group-action" data-role="action" data-action="select-all">全选</button>
  <button type="button" class="chip-group-action" data-role="action" data-action="unselect">取消</button>
</div>
`;

export class ChipGroup extends ItemsElm {
  // templates
  #itemTemplateHTML;
  #itemTemplate;
  #actionsTemplateHTML;
  #actionsTemplate;
  // state
  #mode;
  #selectedValue;
  #selectedValueMode;
  #showActions;
  #showActionsMinCount;
  // event
  #onSelectedChange;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });
    this.#init(options);
  }

  init(root, options = {}) {
    super.init(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });
    this.#init(options);
  }

  #init(options = {}) {
    if (options.mode != null) {
      assertValueIn(options.mode, ["multiple", "single"], "options.mode");

      // Only allow setting mode if it hasn't been set before
      if (this.#mode == null) {
        this.#mode = options.mode;
        this.#selectedValueMode = this.#mode === "multiple" ? 2 : 1;
      }
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

    if (this.#mode == null) {
      this.#mode = DEFAULT_MODE;
      this.#selectedValueMode = DEFAULT_SELECTED_VALUE_MODE;
    }

    if (this.#showActions == null) {
      this.#showActions = DEFAULT_SHOW_ACTIONS;
    }

    if (this.#showActionsMinCount == null) {
      this.#showActionsMinCount = DEFAULT_SHOW_ACTIONS_MIN_COUNT;
    }

    this.#initTemplates(options);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // templates
  // -----------------------------------------------------------------------------

  #initTemplates(options = {}) {
    this.#initItemTemplate(options);
    this.#initActionsTemplate(options);
  }

  #initItemTemplate(options) {
    if (options.itemTemplateHTML != null) {
      assertNonBlankString(
        options.itemTemplateHTML,
        "options.itemTemplateHTML",
      );

      if (this.#itemTemplateHTML === options.itemTemplateHTML) {
        return;
      }

      const itemTemplateHTML = options.itemTemplateHTML;
      const itemTemplate = this.createElementByHTML(itemTemplateHTML);
      this.#validateItemTemplate(itemTemplate);

      this.#itemTemplateHTML = itemTemplateHTML;
      this.#itemTemplate = itemTemplate;
      return;
    }

    if (this.#itemTemplate == null) {
      const itemTemplate = this.createElementByHTML(DEFAULT_ITEM_TEMPLATE_HTML);
      this.#itemTemplateHTML = DEFAULT_ITEM_TEMPLATE_HTML;
      this.#itemTemplate = itemTemplate;
    }
  }

  #initActionsTemplate(options) {
    if (options.actionsTemplateHTML != null) {
      assertNonBlankString(
        options.actionsTemplateHTML,
        "options.actionsTemplateHTML",
      );

      if (this.#actionsTemplateHTML === options.actionsTemplateHTML) {
        return;
      }

      const actionsTemplateHTML = options.actionsTemplateHTML;
      const actionsTemplate = this.createElementByHTML(actionsTemplateHTML);
      this.#validateActionsTemplate(actionsTemplate);

      this.#actionsTemplateHTML = actionsTemplateHTML;
      this.#actionsTemplate = actionsTemplate;
      return;
    }

    if (this.#actionsTemplate == null) {
      const actionsTemplate = this.createElementByHTML(
        DEFAULT_ACTIONS_TEMPLATE_HTML,
      );
      this.#actionsTemplateHTML = DEFAULT_ACTIONS_TEMPLATE_HTML;
      this.#actionsTemplate = actionsTemplate;
    }
  }

  #validateItemTemplate(element) {
    assertElementMatches(element, '[data-role="item"]', "item element");
    assertElementContains(element, '[data-role="text"]', "item element");
  }

  #validateActionsTemplate(element) {
    assertElementMatches(element, '[data-role="actions"]', "actions element");
    assertElementContains(
      element,
      '[data-role="action"][data-action="select-all"]',
      "actions element",
    );
    assertElementContains(
      element,
      '[data-role="action"][data-action="unselect"]',
      "actions element",
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
        target: this.rootElement,
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
    if (this.rootElement == null) {
      return;
    }

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
  createItemElement(item) {
    const value = item[this.valueField];
    const text = item[this.textField];
    const tooltip = item[this.tooltipField];

    const itemElement = this.#itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text || value;
    itemElement.title = tooltip || text || "";

    return itemElement;
  }

  createFooterElement() {
    if (
      this.#selectedValueMode === 2 &&
      this.#showActions &&
      this.items.length >= this.#showActionsMinCount
    ) {
      const actionsElement = this.#actionsTemplate.cloneNode(true);
      return actionsElement;
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
