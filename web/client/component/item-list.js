import { ItemsElm } from "./base/items-elm.js";
import {
  isNullishOrEmpty,
  assertNonBlankString,
  assertFunction,
} from "welm-cdp/infra/assert";

const ROOT_CLASS = "item-list";
const DEFAULT_ITEM_TEMPLATE_HTML = `
<div class="item-list-item" data-role="item">
  <div class="item-list-check">
    <input type="checkbox" class="item-list-checkbox" data-role="checkbox" tabindex="-1">
  </div>
  <div class="item-list-content" data-role="content">
    <span class="item-list-text" data-role="text"></span>
  </div>
</div>
`;

export class ItemList extends ItemsElm {
  // templates
  #itemTemplateHTML;
  #itemTemplate;
  // state
  #selectedValue;
  #selectedValueMode = 1;
  #checkedValue;
  #checkedValueMode = 2;
  // event
  #onSelectedChange;
  #onCheckedChange;
  #onDoubleClick;

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
    this.#initTemplates(options);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // templates
  // -----------------------------------------------------------------------------

  #initTemplates(options) {
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

  #validateItemTemplate(element) {
    // querySelector will not match the itemElement itself,
    // so we use matches to check for the itemElement itself
    if (!element.matches('[data-role="item"]')) {
      throw new Error("item element must have data-role='item'");
    }

    if (!element.querySelector('[data-role="content"]')) {
      throw new Error(
        "item element must have a child element with data-role='content'",
      );
    }

    if (!element.querySelector('[data-role="text"]')) {
      throw new Error(
        "item element must have a child element with data-role='text'",
      );
    }

    if (!element.querySelector('[data-role="checkbox"]')) {
      throw new Error(
        "item element must have a child element with data-role='checkbox'",
      );
    }
  }

  // -----------------------------------------------------------------------------
  // selected value
  // -----------------------------------------------------------------------------

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
        target: this,
        value: this.getSelectedValue(),
        item: this.getItem(newValue),
      });
    }
  }

  // -----------------------------------------------------------------------------
  // checked value
  // -----------------------------------------------------------------------------

  getCheckedValue() {
    if (isNullishOrEmpty(this.#checkedValue)) {
      return null;
    }
    return this.#checkedValueMode === 2
      ? [...this.#checkedValue]
      : this.#checkedValue;
  }

  setCheckedValue(value) {
    this.validateValueByMode(value, this.#checkedValueMode);

    const oldValue = this.#checkedValue;
    if (isNullishOrEmpty(value)) {
      this.#checkedValue = null;
    } else {
      this.validateValueExists(value);
      this.#checkedValue = this.#checkedValueMode === 2 ? [...value] : value;
    }

    const newValue = this.#checkedValue;
    if (!this.isEqualValue(newValue, oldValue)) {
      this.#updateCheckedState();

      this.#onCheckedChange?.({
        target: this,
        value: this.getCheckedValue(),
        item: this.getItem(newValue),
      });
    }
  }

  checkAll() {
    this.setCheckedValue(this.itemValues);
  }

  uncheckAll() {
    this.setCheckedValue(null);
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

  set onCheckedChange(handler) {
    if (handler != null) {
      assertFunction(handler, "handler");
      this.#onCheckedChange = handler;
      return;
    }

    // handler can be null to remove the event listener
    this.#onCheckedChange = null;
  }

  set onDoubleClick(handler) {
    if (handler != null) {
      assertFunction(handler, "handler");
      this.#onDoubleClick = handler;
      return;
    }

    // handler can be null to remove the event listener
    this.#onDoubleClick = null;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    if (this.rootElement == null) {
      return;
    }

    this.dom.onRoot("click", this.#handleRootClick);
    this.dom.onRoot("dblclick", this.#handleRootDoubleClick);
  }

  #handleRootClick = (event, { targetClosest }) => {
    targetClosest('[data-role="content"]', ({ target }) => {
      const itemElement = target.closest('[data-role="item"]');
      if (itemElement != null) {
        const value = itemElement.dataset.value;
        this.setSelectedValue(value);
      }
    });

    targetClosest('[data-role="checkbox"]', ({ target }) => {
      const itemElement = target.closest('[data-role="item"]');
      if (itemElement != null) {
        const value = itemElement.dataset.value;
        const oldValue = this.#checkedValue ?? [];
        const newValue = oldValue.includes(value)
          ? oldValue.filter((v) => v !== value)
          : [...oldValue, value];

        this.setCheckedValue(newValue);
      }
    });
  };

  #handleRootDoubleClick = (event, { targetClosest }) => {
    const itemElement = targetClosest('[data-role="item"]');
    if (itemElement != null) {
      const value = itemElement.dataset.value;
      this.#onDoubleClick?.({
        target: this,
        value: value,
        item: this.getItem(value),
      });
    }
  };

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

  #updateCheckedState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let checked = false;
      if (this.#checkedValueMode === 1) {
        checked = this.#checkedValue === value;
      } else if (this.#checkedValueMode === 2) {
        checked = this.#checkedValue?.includes(value) ?? false;
      }

      element.classList.toggle("is-checked", checked);

      const checkbox = element.querySelector('[data-role="checkbox"]');
      checkbox?.checked = checked;
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

  // Override
  onItemsChange(items) {
    this.#selectedValue = this.filterExistingValue(this.#selectedValue);
    this.#checkedValue = this.filterExistingValue(this.#checkedValue);
  }

  // override
  afterRender(items) {
    this.#updateSelectedState();
    this.#updateCheckedState();
  }
}
