import {
  assertItem,
  assertItems,
  assertValue,
  assertValues,
  filterValue,
  filterValues,
  getItemsByValues,
  haveSameValues,
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

    this.#value = assertValue(
      options.value ?? null,
      this.#items,
      this.#valueField,
    );

    this.#checkedValues = assertValues(
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

  // -----------------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------------

  getItems() {
    return [...this.#items];
  }

  async setItems(items = []) {
    assertItems(items, this.#textField, this.#valueField);

    const oldItems = this.#items;
    const oldValue = this.#value;
    const oldCheckedValues = this.#checkedValues;

    const value = filterValue(oldValue, items, this.#valueField);
    const checkedValues = filterValues(
      oldCheckedValues,
      items,
      this.#valueField,
    );

    this.#items = [...items];
    this.#value = value;
    this.#checkedValues = checkedValues;

    this.#render();

    if (this.#onChange && value !== oldValue) {
      const item = this.#items.find((item) => item[this.#valueField] === value);

      const oldItem = oldItems.find(
        (item) => item[this.#valueField] === oldValue,
      );

      await this.#onChange(item, oldItem);
    }

    if (
      this.#onCheckedChange &&
      !haveSameValues(checkedValues, oldCheckedValues)
    ) {
      const checkedItems = this.#items.filter((item) =>
        checkedValues.includes(item[this.#valueField]),
      );

      const oldCheckedItems = oldItems.filter((item) =>
        oldCheckedValues.includes(item[this.#valueField]),
      );

      await this.#onCheckedChange(checkedItems, oldCheckedItems);
    }

    await this.#onSetItems?.([...this.#items]);
  }

  updateItem(item) {
    assertItem(item, this.#textField, this.#valueField);

    const value = item[this.#valueField];

    const index = this.#items.findIndex(
      (item) => item[this.#valueField] === value,
    );

    if (index === -1) {
      throw new Error(`item not found: ${value}`);
    }

    this.#items[index] = { ...item };

    this.setItems(this.#items);
  }

  getValue() {
    return this.#value;
  }

  async setValue(value) {
    const validatedValue = assertValue(value, this.#items, this.#valueField);
    await this.#changeValue(validatedValue);
  }

  async unselect() {
    await this.setValue(null);
  }

  getCheckedValues() {
    return [...this.#checkedValues];
  }

  async setCheckedValues(values) {
    const validatedValues = assertValues(values, this.#items, this.#valueField);
    await this.#changeCheckedValues(validatedValues);
  }

  async checkAll() {
    const allValues = this.#items.map((item) => item[this.#valueField]);
    await this.#changeCheckedValues(allValues);
  }

  async uncheckAll() {
    await this.#changeCheckedValues([]);
  }

  // -----------------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------------

  async #changeValue(value, event) {
    const oldValue = this.#value;

    if (value === oldValue) {
      return;
    }

    this.#value = value;
    this.#updateSelectedState();

    if (this.#onChange) {
      const [item, oldItem] = getItemsByValues(
        [value, oldValue],
        this.#items,
        this.#valueField,
      );
      await this.#onChange(item, oldItem, event);
    }
  }

  async #changeCheckedValues(values, options = {}) {
    const oldValues = this.#checkedValues;

    if (haveSameValues(values, oldValues)) {
      return;
    }

    this.#checkedValues = values;
    this.#updateCheckedState();

    if (this.#onCheckedChange) {
      const items = getItemsByValues(values, this.#items, this.#valueField);

      const oldItems = getItemsByValues(
        oldValues,
        this.#items,
        this.#valueField,
      );

      await this.#onCheckedChange(items, oldItems, options.event);
    }
  }

  #eventDelegation(event, container, selector, callback) {
    const targetElement = event.target.closest(selector);

    if (targetElement && container.contains(targetElement)) {
      callback(targetElement, event);
    }
  }

  #bindEvents() {
    this.#container.addEventListener("click", async (event) => {
      const itemEl = event.target.closest(".list-item");
      const itemContentEl = event.target.closest(".list-item-content-container");
      const itemCheckboxEl = event.target.closest(".list-item-checkbox");

      const value = itemEl?.dataset.value;

      if (itemContentEl && this.#container.contains(itemContentEl)) {
        await this.#changeValue(value, event);
        return;
      }

      if (itemCheckboxEl && this.#container.contains(itemCheckboxEl)) {
        const oldCheckedValues = this.#checkedValues;
        let newCheckedValues = [];

        if (oldCheckedValues.includes(value)) {
          newCheckedValues = oldCheckedValues.filter((v) => v !== value);
        } else {
          newCheckedValues = [...oldCheckedValues, value];
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

    this.#updateSelectedState();
    this.#updateCheckedState();
  }

  #renderItem(item) {
    const itemElement = document.createElement("div");
    const checkboxContainer = document.createElement("div");
    const contentContainer = document.createElement("div");

    itemElement.className = "list-item";
    checkboxContainer.className = "list-item-checkbox-container";
    contentContainer.className = "list-item-content-container";

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

  #updateSelectedState() {
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
}
