import { ItemsElm, filterValue } from "./base/items-elm.js";

const DEFAULT_ITEM_ELEMENT_HTML = `
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
  #className = "item-list";
  // templates
  #itemElementTemplate;
  // state
  #value;
  #valueMode = 1;
  #checkedValue;
  #checkedValueMode = 2;
  // event
  #onChange;
  #onDblclick;
  #onCheckedChange;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: this.#className,
    });
    this.#init(root, options);
  }

  init(root, options = {}) {
    super.init(root, {
      ...options,
      rootClass: this.#className,
    });
    this.#init(root, options);
  }

  #init(root, options = {}) {
    this.#initTemplates(options);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // templates
  // -----------------------------------------------------------------------------

  #initTemplates(options) {
    const itemElementHTML =
      options.itemElementHTML ?? DEFAULT_ITEM_ELEMENT_HTML;
    this.#itemElementTemplate = this.createElementByHTML(itemElementHTML);

    if (options.itemElementHTML != null) {
      this.#validateItemElementTemplate(this.#itemElementTemplate);
    }
  }

  #validateItemElementTemplate(element) {
    // querySelector will not match the itemElement itself,
    // so we use matches to check for the itemElement itself
    if (!element.matches('[data-role="item"]')) {
      throw new Error("itemElement must have data-role='item'");
    }

    if (!element.querySelector('[data-role="content"]')) {
      throw new Error(
        "itemElement must have a child element with data-role='content'",
      );
    }

    if (!element.querySelector('[data-role="text"]')) {
      throw new Error(
        "itemElement must have a child element with data-role='text'",
      );
    }

    if (!element.querySelector('[data-role="checkbox"]')) {
      throw new Error(
        "itemElement must have a child element with data-role='checkbox'",
      );
    }
  }

  // -----------------------------------------------------------------------------
  // value
  // -----------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  getValue() {
    if (this.#value == null) {
      return null;
    }

    if (this.#valueMode === 2) {
      return this.#value.length > 0 ? [...this.#value] : null;
    }

    return this.#value;
  }

  setValue(value) {
    const oldValue = this.#value;

    if (isNullOrEmpty(value)) {
      this.#value = null;
    } else {
      assertModeValue(value, this.#valueMode, "value");
      assertValueExists(value, this.items, this.valueField, "value");

      this.#value = this.#valueMode === 1 ? value : [...value];
    }

    const newValue = this.#value;
    if (!isEqualValue(newValue, oldValue)) {
      this.#updateSelectedState();

      this.#onChange?.({
        target: this,
        value: Array.isArray(newValue) ? [...newValue] : newValue,
        item: this.getItemByValue(newValue),
      });
    }
  }

  // -----------------------------------------------------------------------------
  // checked value
  // -----------------------------------------------------------------------------

  get checkedValue() {
    return this.#checkedValue;
  }

  getCheckedValue() {
    if (this.#checkedValue == null) {
      return null;
    }

    if (this.#checkedValueMode === 2) {
      return this.#checkedValue.length > 0 ? [...this.#checkedValue] : null;
    }

    return this.#checkedValue;
  }

  setCheckedValue(value) {
    const oldValue = this.#checkedValue;

    if (isNullOrEmpty(value)) {
      this.#checkedValue = null;
    } else {
      assertModeValue(value, this.#checkedValueMode, "checkedValue");
      assertValueExists(value, this.items, this.valueField, "checkedValue");

      this.#checkedValue = this.#checkedValueMode === 1 ? value : [...value];
    }

    const newValue = this.#checkedValue;
    if (!isEqualValue(newValue, oldValue)) {
      this.#updateCheckedState();

      this.#onCheckedChange?.({
        target: this,
        value: Array.isArray(newValue) ? [...newValue] : newValue,
        item: this.getItemByValue(newValue),
      });
    }
  }

  checkAll() {
    const values = this.items.map((item) => item[this.valueField]);
    this.setCheckedValue(values);
  }

  uncheckAll() {
    this.setCheckedValue(null);
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

  set onChange(handler) {
    // handler can be null to remove the event listener
    this.#onChange = handler == null ? null : handler;
  }

  set onDblclick(handler) {
    // handler can be null to remove the event listener
    this.#onDblclick = handler == null ? null : handler;
  }

  set onCheckedChange(handler) {
    // handler can be null to remove the event listener
    this.#onCheckedChange = handler == null ? null : handler;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    if (this.rootElement == null) {
      return;
    }

    this.dom.onRoot("click", this.#root_ClickHandler);
    this.dom.onRoot("dblclick", this.#root_DblclickHandler);
  }

  #root_ClickHandler = (event, { targetClosest }) => {
    const value = targetClosest('[data-role="item"]')?.dataset.value;

    targetClosest('[data-role="content"]', ({ target }) => {
      this.setValue(value);
    });

    targetClosest('[data-role="checkbox"]', ({ target }) => {
      const oldValue = this.#checkedValue ?? [];

      const newValue = oldValue.includes(value)
        ? oldValue.filter((v) => v !== value)
        : [...oldValue, value];

      this.setCheckedValue(newValue);
    });
  };

  #root_DblclickHandler = (event, { targetClosest }) => {
    const target = targetClosest('[data-role="item"]');
    if (target != null) {
      this.#onDblclick?.({
        target: this,
        value: target.dataset.value,
        item: this.getItemByValue(target.dataset.value),
      });
    }
  };

  #updateSelectedState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let selected = false;
      if (this.#valueMode === 1) {
        selected = this.#value === value;
      } else if (this.#valueMode === 2) {
        selected = this.#value?.includes(value) ?? false;
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

  // Override
  onItemsChange(items) {
    if (isNullOrEmpty(items)) {
      this.#value = null;
      this.#checkedValue = null;
    } else {
      this.#value = filterValue(this.#value, this.itemValues);
      this.#checkedValue = filterValue(this.#checkedValue, this.itemValues);
    }
  }

  // override
  createItemElement(item) {
    const text = item[this.textField];
    const value = item[this.valueField];
    const tooltip = item[this.tooltipField];

    const itemElement = this.#itemElementTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text;
    itemElement.title = tooltip || text || "";

    return itemElement;
  }

  // override
  afterRender(items) {
    this.#updateSelectedState();
    this.#updateCheckedState();
  }
}

/** assert value */

function assertModeValue(value, valueMode = 1, fieldName = "value") {
  if (value == null) {
    return;
  }

  if (valueMode === 1) {
    if (!isNonBlankString(value)) {
      throw new Error(`${fieldName} must be a non-blank string`);
    }
  } else if (valueMode === 2) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`${fieldName} must be a non-empty array`);
    }
    for (const v of value) {
      assertNonBlankString(v, fieldName);
    }
    if (value.length !== new Set(value).size) {
      throw new Error(`${fieldName} must not contain duplicates`);
    }
  } else {
    throw new Error(`invalid valueMode for ${fieldName}: ${valueMode}`);
  }
}

function assertValueExists(value, items, valueField, fieldName = "value") {
  const values = items.map((i) => i[valueField]);
  const [value_values] = normalizeArray(value);

  const missingValue = value_values.find((v) => !values.includes(v));
  if (missingValue) {
    throw new Error(`${fieldName} '${missingValue}' does not exist in items`);
  }
}

/** assert base */

function assertNonBlankString(value, fieldName = "value") {
  if (!isNonBlankString(value)) {
    throw new Error(`${fieldName} must be a non-blank string`);
  }
}

function assertNonBlankStringOrArray(value, fieldName = "value") {
  const [values, isArray] = normalizeArray(value);

  if (isArray && values.length === 0) {
    throw new Error(
      `${fieldName} must be a non-blank string or a non-empty array of non-blank strings`,
    );
  }

  for (const v of values) {
    assertNonBlankString(v, fieldName);
  }
}

// ----------------------------------------------
// Private helper functions
// ----------------------------------------------

function isNonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isNullOrEmpty(value) {
  if (
    value == null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return true;
  }
  return false;
}

function normalizeArray(value) {
  return Array.isArray(value) ? [value, true] : [[value], false];
}

function isEqualValue(value1, value2) {
  if (value1 == null || value2 == null) {
    return value1 == null && value2 == null;
  }

  if (typeof value1 === "string" && typeof value2 === "string") {
    return value1 === value2;
  }

  if (Array.isArray(value1) && Array.isArray(value2)) {
    if (value1.length !== value2.length) {
      return false;
    }

    const sortedValues1 = [...value1].sort();
    const sortedValues2 = [...value2].sort();

    return sortedValues1.every(
      (value, index) => value === sortedValues2[index],
    );
  }

  return false;
}

function normalizeArray(value) {
  return Array.isArray(value) ? [value, true] : [[value], false];
}
