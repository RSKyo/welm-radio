import { ItemsElm } from "./base/items-elm.js";
import {
  assertBoolean,
  isNullishOrEmpty,
  assertNonBlankString,
  assertFunction,
  assertElementMatches,
  assertElementContains,
  assertValueIn,
} from "./base/assert.js";

const ROOT_CLASS = "item-list";
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

export class ItemList extends ItemsElm {
  // templates
  #itemTemplate;
  // state
  #selectedValue;
  #selectedValueMode = 1;
  #checkedValue;
  #checkedValueMode = 2;
  #showCheckboxes = true;
  // event
  #onSelectedChange;
  #onCheckedChange;
  #onDoubleClick;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });

    if (options.selectedValueMode != null) {
      assertValueIn(
        options.selectedValueMode,
        [1, 2],
        "options.selectedValueMode",
      );
      this.#selectedValueMode = options.selectedValueMode;
    }

    if (options.checkedValueMode != null) {
      assertValueIn(
        options.checkedValueMode,
        [1, 2],
        "options.checkedValueMode",
      );
      this.#checkedValueMode = options.checkedValueMode;
    }

    if (options.showCheckboxes != null) {
      assertBoolean(options.showCheckboxes, "options.showCheckboxes");
      this.#showCheckboxes = options.showCheckboxes;
    }

    this.#initItemTemplate(options.itemTemplate);

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
    assertElementContains(itemTemplate, '[data-role="content"]', assertionSubject);
    assertElementContains(itemTemplate, '[data-role="text"]', assertionSubject);
    assertElementContains(itemTemplate, '[data-role="check"]', assertionSubject);
    assertElementContains(itemTemplate, '[data-role="checkbox"]', assertionSubject);

    this.#itemTemplate = itemTemplate;
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
        value: this.getSelectedValue(),
        item: this.getItem(newValue),
      });
    }
  }

  // -----------------------------------------------------------------------------
  // checked value
  // -----------------------------------------------------------------------------

  #assertCheckboxesEnabled() {
    if (!this.#showCheckboxes) {
      throw new Error("Checkboxes are not enabled for this item list");
    }
  }

  getCheckedValue() {
    this.#assertCheckboxesEnabled();

    if (isNullishOrEmpty(this.#checkedValue)) {
      return null;
    }
    return this.#checkedValueMode === 2
      ? [...this.#checkedValue]
      : this.#checkedValue;
  }

  setCheckedValue(value) {
    this.#assertCheckboxesEnabled();

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
        value: this.getCheckedValue(),
        item: this.getItem(newValue),
      });
    }
  }

  checkAll() {
    this.#assertCheckboxesEnabled();
    this.setCheckedValue(this.itemValues);
  }

  uncheckAll() {
    this.#assertCheckboxesEnabled();
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
    this.#assertCheckboxesEnabled();

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
    this.dom.onRoot("click", this.#handleRootClick);
    this.dom.onRoot("dblclick", this.#handleRootDoubleClick);
  }

  #handleRootClick = (event, { targetClosest }) => {
    targetClosest('[data-role="content"]', ({ target }) => {
      const itemElement = target.closest('[data-role="item"]');
      const value = itemElement.dataset.value;

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

    if (this.#showCheckboxes) {
      targetClosest('[data-role="checkbox"]', ({ target }) => {
        const itemElement = target.closest('[data-role="item"]');
        const value = itemElement.dataset.value;

        if (this.#checkedValueMode === 1) {
          this.setCheckedValue(value);
          return;
        }

        const oldValue = this.#checkedValue ?? [];
        const newValue = oldValue.includes(value)
          ? oldValue.filter((v) => v !== value)
          : [...oldValue, value];

        this.setCheckedValue(newValue);
      });
    }
  };

  #handleRootDoubleClick = (event, { targetClosest }) => {
    const itemElement = targetClosest('[data-role="item"]');
    if (itemElement != null) {
      const value = itemElement.dataset.value;
      this.#onDoubleClick?.({
        value: value,
        item: this.getItem(value),
      });
    }
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
      if (checkbox) {
        checkbox.checked = checked;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // Override
  onItemsChange(items) {
    this.#selectedValue = this.filterExistingValue(this.#selectedValue);
    this.#checkedValue = this.filterExistingValue(this.#checkedValue);
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

    itemElement.classList.toggle("no-check", !this.#showCheckboxes);

    this.dom.add(value, itemElement);
  }

  // override
  afterRender(items) {
    this.#updateSelectedState();
    this.#updateCheckedState();
  }
}
