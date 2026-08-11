import { Elm } from "./elm.js";
import {
  safeHandler,
  initRootElement,
  detectFields,
  validateItems,
  validateItem,
  filterValue,
  validateModeValue,
  validateValue,
  validateValueExists,
  isEqualValue,
} from "./helper.js";
export class ItemList extends Elm {
  #rootClass="item-list";
  #root;
  #textField;
  #valueField;
  #tooltipField;
  #items;
  #value;
  #valueMode;
  #checkedValue;
  #checkedValueMode;
  #onSetItems;
  #onClick;
  #onDoubleClick;
  #onCheckedChange;
  #onRenderItem;

  constructor(root, options = {}) {
    this.#root = initRootElement(root, this.#rootClass);
    this.#textField = options.textField ?? null;
    this.#valueField = options.valueField ?? null;
    this.#tooltipField = options.tooltipField ?? null;
    this.#items = [];
    this.#value = null;
    this.#valueMode = 1;
    this.#checkedValue = null;
    this.#checkedValueMode = 2;
    this.#onSetItems = null;
    this.#onClick = null;
    this.#onDoubleClick = null;
    this.#onCheckedChange = null;
    this.#onRenderItem = null;

    this.#bindEvents();
  }

  get root() {
    return this.#root;
  }

  get dataset() {
    return this.#root.dataset;
  }

  // -----------------------------------------------------------------------------
  // items
  // -----------------------------------------------------------------------------

  get items() {
    return this.#items.map((item) => ({ ...item }));
  }

  setItems(items) {
    if (items == null) {
      this.#items = [];
      this.#value = null;
      this.#checkedValue = null;
      return;
    }

    if (!this.#textField || !this.#valueField || !this.#tooltipField) {
      const { textField, valueField, tooltipField } = detectFields(items);
      this.#textField = textField;
      this.#valueField = valueField;
      this.#tooltipField = tooltipField;
    }

    validateItems(items, this.#textField, this.#valueField);
    this.#items = items.map((item) => ({ ...item }));

    this.#value = filterValue(this.#value, this.#items, this.#valueField);
    this.#checkedValue = filterValue(
      this.#checkedValue,
      this.#items,
      this.#valueField,
    );

    this.#render(this.items);

    this.#onSetItems?.(this.items);
  }

  updateItem(newItem) {
    if (newItem == null) {
      throw new Error("newItem must be provided");
    }

    validateItem(newItem, this.#valueField);

    const value = newItem[this.#valueField];
    validateValueExists(value, this.#items, this.#valueField);

    const index = this.#items.findIndex(
      (item) => item[this.#valueField] === value,
    );

    this.#items[index] = { ...newItem };
  }

  getItemByValue(value) {
    if (value == null) {
      return null;
    }

    const isArray = Array.isArray(value);
    const values = isArray ? [...value] : [value];

    const items = this.#items.filter((item) =>
      values.includes(item[this.#valueField]),
    );
    if (items.length === 0) {
      return null;
    }

    return isArray ? items.map((item) => ({ ...item })) : { ...items[0] };
  }

  // -----------------------------------------------------------------------------
  // value
  // -----------------------------------------------------------------------------

  get value() {
    if (this.#value == null) {
      return null;
    }

    if (this.#valueMode === 2) {
      return [...this.#value];
    }

    return this.#value;
  }

  setValue(value) {
    validateModeValue(value, this.#valueMode);
    validateValue(value);
    validateValueExists(value, this.#items, this.#valueField);

    const oldValue = this.#value;
    this.#value = this.#valueMode === 1 ? value : [...value];

    if (!isEqualValue(value, oldValue)) {
      this.#updateSelectedState();

      if (value != null) {
        this.#onClick?.({
          target: this,
          value: Array.isArray(value) ? [...value] : value,
          item: this.getItemByValue(value),
        });
      }
    }
  }

  // -----------------------------------------------------------------------------
  // checked value
  // -----------------------------------------------------------------------------

  get checkedValue() {
    if (this.#checkedValue == null) {
      return null;
    }

    if (this.#checkedValueMode === 2) {
      return [...this.#checkedValue];
    }

    return this.#checkedValue;
  }

  setCheckedValue(value) {
    validateModeValue(value, this.#checkedValueMode);
    validateValue(value);
    validateValueExists(value, this.#items, this.#valueField);

    const oldValue = this.#checkedValue;
    this.#checkedValue = this.#checkedValueMode === 1 ? value : [...value];

    if (!isEqualValue(value, oldValue)) {
      this.#updateCheckedState();

      this.#onCheckedChange?.({
        target: this,
        value: Array.isArray(value) ? [...value] : value,
        item: this.getItemByValue(value),
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

  get onSetItems() {
    return this.#onSetItems;
  }

  set onSetItems(handler) {
    this.#onSetItems = safeHandler(handler);
  }

  get onClick() {
    return this.#onClick;
  }

  set onClick(handler) {
    this.#onClick = safeHandler(handler);
  }

  get onDoubleClick() {
    return this.#onDoubleClick;
  }

  set onDoubleClick(handler) {
    this.#onDoubleClick = safeHandler(handler);
  }

  get onCheckedChange() {
    return this.#onCheckedChange;
  }

  set onCheckedChange(handler) {
    this.#onCheckedChange = safeHandler(handler);
  }

  get onRenderItem() {
    return this.#onRenderItem;
  }

  set onRenderItem(handler) {
    this.#onRenderItem = handler;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.root.addEventListener("click", (event) => {
      const itemElement = event.target.closest(`.${this.#rootClass}-item`);
      const value = itemElement?.dataset.value;

      this.#handleClosest(event, `.${this.#rootClass}-content`, () => {
        if (value === this.value) {
          return;
        }
        this.setValue(value);
      });

      this.#handleClosest(event, `.${this.#rootClass}-checkbox`, () => {
        const oldCheckedValues = this.#checkedValue;
        let newCheckedValues = [];

        if (oldCheckedValues?.includes(value)) {
          newCheckedValues = oldCheckedValues.filter((v) => v !== value);
        } else {
          newCheckedValues = [...(oldCheckedValues ?? []), value];
        }

        this.setCheckedValue(newCheckedValues);
      });
    });

    this.root.addEventListener("dblclick", (event) => {
      const itemElement = event.target.closest(`.${this.#rootClass}-item`);
      const value = itemElement?.dataset.value;

      this.#handleClosest(event, `.${this.#rootClass}-content`, () => {
        if (this.#onDoubleClick) {
          const item = this.items.find(
            (item) => item[this.valueField] === value,
          );
          this.#onDoubleClick(item, event);
        }
      });
    });
  }

  #handleClosest(event, selector, handler) {
    const el = event.target.closest(selector);
    if (el && this.root.contains(el)) {
      handler(el);
    }
  }

  // -----------------------------------------------------------------------------
  // rendering and updating the DOM
  // -----------------------------------------------------------------------------

  #render(items) {
    this.root.innerHTML = "";

    if (items.length === 0) {
      const emptyElement = document.createElement("div");
      emptyElement.className = `${this.#rootClass}-empty`;
      emptyElement.textContent = "No items";
      this.root.appendChild(emptyElement);
      return;
    }

    for (const item of items) {
      const itemElement = this.#renderItem(item);
      this.root.appendChild(itemElement);
    }

    this.#updateSelectedState();
    this.#updateCheckedState();
  }

  #renderItem(item) {
    const itemElement = document.createElement("div");
    const checkboxContainer = document.createElement("div");
    const contentContainer = document.createElement("div");

    itemElement.className = `${this.#rootClass}-item`;
    checkboxContainer.className = `${this.#rootClass}-check`;
    contentContainer.className = `${this.#rootClass}-content`;

    const checkbox = document.createElement("input");

    checkbox.className = `${this.#rootClass}-checkbox`;
    checkbox.type = "checkbox";
    checkbox.tabIndex = -1;

    checkboxContainer.appendChild(checkbox);

    const contentElement = this.#onRenderItem
      ? this.#onRenderItem(item)
      : this.#createDefaultContentElement(item);

    if (!(contentElement instanceof HTMLElement)) {
      throw new Error("onRenderItem must return an HTMLElement");
    }

    contentContainer.appendChild(contentElement);

    itemElement.append(checkboxContainer, contentContainer);
    itemElement.dataset.value = item[this.valueField];

    return itemElement;
  }

  #createDefaultContentElement(item) {
    const textElement = document.createElement("span");
    textElement.className = `${this.#rootClass}-text`;

    textElement.textContent = item[this.textField];
    textElement.title = item[this.titleField] || item[this.textField];

    return textElement;
  }

  #updateSelectedState() {
    const itemElements = this.root.querySelectorAll(`.${this.#rootClass}-item`);

    for (const itemElement of itemElements) {
      itemElement.classList.toggle(
        "is-selected",
        itemElement.dataset.value === this.#value,
      );
    }
  }

  #updateCheckedState() {
    const itemElements = this.root.querySelectorAll(`.${this.#rootClass}-item`);

    for (const itemElement of itemElements) {
      const checked = this.#checkedValues.includes(itemElement.dataset.value);
      const checkbox = itemElement.querySelector(`.${this.#rootClass}-checkbox`);
      checkbox.checked = checked;
      itemElement.classList.toggle("is-checked", checked);
    }
  }
}
