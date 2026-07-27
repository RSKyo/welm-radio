import {
  assertItem,
  assertItems,
  resolveValue,
  resolveValues,
  filterValue,
  filterValues,
} from "./item.js";

export class ItemList {
  #container;
  #textField;
  #valueField;
  #items;
  #value;
  #checkedValues;
  #onChange;
  #onCheckedChange;
  #onRenderItem;
  #onSetItems;

  constructor(containerSelector, options = {}) {
    this.#container = document.querySelector(containerSelector);

    if (!this.#container) {
      throw new Error(`container not found: ${containerSelector}`);
    }

    this.#textField = options.textField ?? "text";
    this.#valueField = options.valueField ?? "value";

    this.#items = [
      ...assertItems(options.items ?? [], this.#textField, this.#valueField),
    ];

    this.#value = resolveValue(
      options.value ?? null,
      this.#items,
      this.#valueField,
    );

    this.#checkedValues = resolveValues(
      options.checkedValues ?? [],
      this.#items,
      this.#valueField,
    );

    this.#onChange = options.onChange ?? null;
    this.#onCheckedChange = options.onCheckedChange ?? null;
    this.#onRenderItem = options.onRenderItem ?? null;
    this.#onSetItems = options.onSetItems ?? null;

    this.#container.classList.add("item-list");

    this.#bindEvents();
    this.#render();
  }

  // #region Public Methods

  async setItems(items = []) {
    assertItems(items, this.#textField, this.#valueField);

    const oldItems = this.#items;
    const oldValue = this.#value;
    const oldCheckedValues = this.#checkedValues;

    const value = filterValue(oldValue, items, this.#valueField);
    const checkedValues = filterValues(oldCheckedValues, items, this.#valueField);

    this.#items = [...items];
    this.#value = value;
    this.#checkedValues = checkedValues;

    this.#render();

    if (value !== oldValue) {
      const item = this.#items.find((item) => item[this.#valueField] === value);

      const oldItem = oldItems.find(
        (item) => item[this.#valueField] === oldValue,
      );

      await this.#onChange?.(item, oldItem);
    }

    if (!this.#compareArrayValues(checkedValues, oldCheckedValues)) {
      const checkedItems = this.#items.filter((item) =>
        checkedValues.includes(item[this.#valueField]),
      );

      const oldCheckedItems = oldItems.filter((item) =>
        oldCheckedValues.includes(item[this.#valueField]),
      );

      await this.#onCheckedChange?.(checkedItems, oldCheckedItems);
    }

    await this.#onSetItems?.([...this.#items]);
  }

  getItems() {
    return [...this.#items];
  }

  updateItem(item) {
    this.#validateItem(item);

    const value = item[this.#valueField];

    const index = this.#items.findIndex(
      (item) => item[this.#valueField] === value,
    );

    if (index === -1) {
      throw new Error(`item not found: ${value}`);
    }

    const oldItemElement = this.#container.children[index];
    const newItemElement = this.#renderItem(item);

    this.#items[index] = item;
    oldItemElement.replaceWith(newItemElement);

    this.#updateActiveState();
    this.#updateCheckedState();
  }

  async setValue(value) {
    const validatedValue = this.#validateValue(value, this.#items);
    await this.#changeValue(validatedValue);
  }

  getValue() {
    return this.#value;
  }

  async clearValue() {
    await this.setValue(null);
  }

  getCheckedValues() {
    return [...this.#checkedValues];
  }

  async setCheckedValues(values) {
    const validatedValues = this.#validateValues(values, this.#items);
    await this.#changeCheckedValues(validatedValues);
  }

  async checkAll() {
    const allValues = this.#items.map((item) => item[this.#valueField]);
    await this.#changeCheckedValues(allValues);
  }

  async uncheckAll() {
    await this.#changeCheckedValues([]);
  }

  // #endregion Public Methods

  // #region Private Methods

  #validateItem(item) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new TypeError("item must be an object");
    }

    const value = item[this.#valueField];

    if (typeof value !== "string" || value === "") {
      throw new Error(
        `item must contain a non-empty string "${this.#valueField}" field`,
      );
    }

    return item;
  }

  #validateItems(items) {
    if (items == null) {
      return [];
    }

    if (!Array.isArray(items)) {
      throw new TypeError("items must be an array");
    }

    const values = new Set();

    for (const item of items) {
      this.#validateItem(item);

      const value = item[this.#valueField];

      if (values.has(value)) {
        throw new Error(`duplicate item value: ${value}`);
      }

      values.add(value);
    }

    return items;
  }

  #validateValue(value, items) {
    if (value == null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new Error("value must be a string");
    }

    if (items && !items.some((item) => item[this.#valueField] === value)) {
      throw new Error(`value not found: ${value}`);
    }

    return value;
  }

  #validateValues(values, items) {
    if (values == null) {
      return [];
    }

    if (!Array.isArray(values)) {
      throw new TypeError("values must be an array");
    }

    for (const value of values) {
      this.#validateValue(value, items);
    }

    if (new Set(values).size !== values.length) {
      throw new Error("duplicate values are not allowed");
    }

    return [...values];
  }

  #filterValue(value, items) {
    if (typeof value !== "string") {
      return null;
    }

    if (items && items.some((item) => item[this.#valueField] === value)) {
      return value;
    }

    return null;
  }

  #filterValues(values, items) {
    if (!Array.isArray(values)) {
      return [];
    }

    const filteredValues = values.filter(
      (value) => this.#filterValue(value, items) !== null,
    );
    return [...new Set(filteredValues)];
  }

  async #changeValue(value, options = {}) {
    const oldValue = this.#value;

    if (value === oldValue) {
      return;
    }

    this.#value = value;

    this.#updateActiveState();
    const item = this.#items.find((item) => item[this.#valueField] === value);
    const oldItem = this.#items.find(
      (item) => item[this.#valueField] === oldValue,
    );

    await this.#onChange?.(item, oldItem, options.event);
  }

  async #changeCheckedValues(values, options = {}) {
    const oldCheckedValues = this.#checkedValues;

    if (this.#compareArrayValues(values, oldCheckedValues)) {
      return;
    }

    this.#checkedValues = values;

    this.#updateCheckedState();

    const items = this.#items.filter((item) =>
      this.#checkedValues.includes(item[this.#valueField]),
    );

    const oldItems = this.#items.filter((item) =>
      oldCheckedValues.includes(item[this.#valueField]),
    );

    await this.#onCheckedChange?.(items, oldItems, options.event);
  }

  #compareArrayValues(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }

    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();

    for (let i = 0; i < sortedArr1.length; i++) {
      if (sortedArr1[i] !== sortedArr2[i]) {
        return false;
      }
    }

    return true;
  }

  #bindEvents() {
    this.#container.addEventListener("click", async (event) => {
      const itemElement = event.target.closest(".list-item");
      const itemContentElement = event.target.closest(".list-item-content");
      const itemCheckboxElement = event.target.closest(".list-item-checkbox");
      const checkedValue = itemElement?.dataset.value;

      if (itemContentElement && this.#container.contains(itemContentElement)) {
        await this.#changeValue(itemElement.dataset.value, { event });
        return;
      }

      if (
        itemCheckboxElement &&
        this.#container.contains(itemCheckboxElement)
      ) {
        const oldCheckedValues = this.#checkedValues;
        let newCheckedValues = [];

        if (oldCheckedValues.includes(checkedValue)) {
          newCheckedValues = oldCheckedValues.filter((v) => v !== checkedValue);
        } else {
          newCheckedValues = [...oldCheckedValues, checkedValue];
        }

        await this.#changeCheckedValues(newCheckedValues, { event });
        return;
      }
    });
  }

  #render() {
    this.#container.innerHTML = "";

    for (const item of this.#items) {
      const itemElement = this.#renderItem(item);
      this.#container.appendChild(itemElement);
    }

    this.#updateActiveState();
    this.#updateCheckedState();
  }

  #renderItem(item) {
    const itemElement = document.createElement("div");
    const checkboxContainer = document.createElement("div");
    const contentContainer = document.createElement("div");

    itemElement.className = "list-item";
    checkboxContainer.className = "list-item-check";
    contentContainer.className = "list-item-content";

    const checkbox = document.createElement("input");

    checkbox.className = "list-item-checkbox";
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
    itemElement.dataset.value = item[this.#valueField];

    return itemElement;
  }

  #createDefaultContentElement(item) {
    const textElement = document.createElement("span");

    textElement.textContent = item[this.#textField];

    return textElement;
  }

  #updateActiveState() {
    const itemElements = this.#container.querySelectorAll(".list-item");

    for (const itemElement of itemElements) {
      itemElement.classList.toggle(
        "is-selected",
        itemElement.dataset.value === this.#value,
      );
    }
  }

  #updateCheckedState() {
    const itemElements = this.#container.querySelectorAll(".list-item");

    for (const itemElement of itemElements) {
      const checked = this.#checkedValues.includes(itemElement.dataset.value);
      const checkbox = itemElement.querySelector(".list-item-checkbox");
      checkbox.checked = checked;
      itemElement.classList.toggle("is-checked", checked);
    }
  }

  // #endregion Private Methods
}
