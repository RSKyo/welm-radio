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

    this.#initOptions(options);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // options
  // -----------------------------------------------------------------------------

  #initOptions(options) {
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

    this.resolveOption(
      "itemTemplate",
      (value, assertionSubject) => {
        this.#itemTemplate = this.resolveElement(value, assertionSubject, {
          matches: ['[data-role="item"]'],
          contains: [
            '[data-role="content"]',
            '[data-role="text"]',
            '[data-role="check"]',
            '[data-role="checkbox"]',
          ],
        });
      },
      () => {
        this.#itemTemplate = this.resolveElement(
          ITEM_TEMPLATE,
          "ITEM_TEMPLATE",
        );
      },
    );
  }

  // -----------------------------------------------------------------------------
  // selected value
  // -----------------------------------------------------------------------------

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

  // -----------------------------------------------------------------------------
  // checked value
  // -----------------------------------------------------------------------------

  #assertCheckboxesEnabled() {
    if (!this.#showCheckboxes) {
      throw new Error("Checkboxes are not enabled for this item list");
    }
  }

  get checkedValue() {
    this.#assertCheckboxesEnabled();

    if (isNullishOrEmpty(this.#checkedValue)) {
      return null;
    }
    return this.#checkedValueMode === 2
      ? [...this.#checkedValue]
      : this.#checkedValue;
  }

  set checkedValue(value) {
    this.#assertCheckboxesEnabled();

    this.assertModeValue(value, this.#checkedValueMode);

    const oldValue = this.#checkedValue;
    if (isNullishOrEmpty(value)) {
      this.#checkedValue = null;
    } else {
      this.assertItemValueExists(value);
      this.#checkedValue = this.#checkedValueMode === 2 ? [...value] : value;
    }

    const newValue = this.#checkedValue;
    if (!this.isEqualValue(newValue, oldValue)) {
      this.#updateCheckedState();

      this.#onCheckedChange?.({
        elm: this,
        value: newValue,
      });
    }
  }

  checkAll() {
    this.#assertCheckboxesEnabled();
    this.checkedValue = this.itemValues;
  }

  uncheckAll() {
    this.#assertCheckboxesEnabled();
    this.checkedValue = null;
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

  #handleRootClick = (event) => {
    const itemElement = this.closestElement(event, '[data-role="item"]');
    const value = itemElement?.dataset.value ?? null;

    this.closestElement(event, '[data-role="content"]', () => {
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

    if (this.#showCheckboxes) {
      this.closestElement(event, '[data-role="checkbox"]', () => {
        if (this.#checkedValueMode === 1) {
          this.checkedValue = value;
          return;
        }

        const oldValue = this.#checkedValue ?? [];
        const newValue = oldValue.includes(value)
          ? oldValue.filter((v) => v !== value)
          : [...oldValue, value];

        this.checkedValue = newValue;
      });
    }
  };

  #handleRootDoubleClick = (event) => {
    const itemElement = this.closestElement(event, '[data-role="item"]');
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

  // override
  afterSetItems(items) {
    this.#selectedValue = this.filterItemValue(this.#selectedValue);
    this.#checkedValue = this.filterItemValue(this.#checkedValue);
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedState();
    this.#updateCheckedState();
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
  afterRemoveItem(removedItem) {
    this.#selectedValue = this.filterItemValue(this.#selectedValue);
    this.#checkedValue = this.filterItemValue(this.#checkedValue);
  }
}
