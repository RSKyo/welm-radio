export class ListGroup {
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

    this.#items = options.items ?? [];
    this.#validateItems(this.#items);

    this.#value = this.#filterValidValue(options.value);
    this.#checkedValues = this.#filterValidValues(options.checkedValues);

    this.#onChange = options.onChange ?? null;
    this.#onCheckedChange = options.onCheckedChange ?? null;
    this.#onRenderItem = options.onRenderItem ?? null;
    this.#onSetItems = options.onSetItems ?? null;

    this.#container.classList.add("list-group");

    this.#bindEvents();
    this.#render();
  }

  // #region Public Methods

  async setItems(items = []) {
    this.#validateItems(items);

    const oldValue = this.#value;
    const oldCheckedValues = this.#checkedValues;

    this.#items = items;
    this.#value = null;
    this.#checkedValues = [];
    this.#render();


    if (oldValue != null) {
      const filteredValue = this.#filterValidValue(oldValue);
      await this.#changeValue(filteredValue);
    }

    if (oldCheckedValues.length > 0) {
      const filteredCheckedValues = this.#filterValidValues(oldCheckedValues);  
      this.#changeCheckedValues(filteredCheckedValues);
    }

    this.#onSetItems?.(items);
  }

  getItems() {
    return [...this.#items];
  }

  getValue() {
    return this.#value;
  }

  getCheckedValues() {
    return [...this.#checkedValues];
  }

  async select(value) {
    const filteredValue = this.#filterValidValue(value);
    await this.#changeValue(filteredValue);
  }

  async clear() {
    await this.select(null);
  }

  check(values) {
    const filteredValues = this.#filterValidValues(values);
    this.#changeCheckedValues(filteredValues);
  }

  checkAll() {
    const allValues = this.#items.map((item) => item[this.#valueField]);
    this.#changeCheckedValues(allValues);
  }

  uncheckAll() {
    this.#changeCheckedValues([]);
  }

  // #endregion Public Methods

  // #region Private Methods

  #validateItems(items) {
    if (!Array.isArray(items)) {
      throw new Error("items must be an array");
    }

    const values = new Set();

    for (const item of items) {
      if (!item || typeof item !== "object") {
        throw new Error("each item must be an object");
      }

      if (!Object.hasOwn(item, this.#textField)) {
        throw new Error(`item must contain ${this.#textField}`);
      }

      if (!Object.hasOwn(item, this.#valueField)) {
        throw new Error(`item must contain ${this.#valueField}`);
      }

      const value = item[this.#valueField];

      if (value == null || typeof value !== "string" || value.trim() === "") {
        throw new Error(`item ${this.#valueField} must be a non-empty string`);
      }

      const normalizedValue = value;

      if (values.has(normalizedValue)) {
        throw new Error(
          `duplicate item ${this.#valueField}: ${normalizedValue}`,
        );
      }

      values.add(normalizedValue);
    }
  }

  #filterValidValue(value) {
    if (
      typeof value === "string" &&
      this.#items.some((item) => item[this.#valueField] === value)
    ) {
      return value;
    }

    return null;
  }

  #filterValidValues(values) {
    if (Array.isArray(values)) {
      return values.filter((value) => this.#filterValidValue(value) != null);
    }

    return [];
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

  #changeCheckedValues(values, options = {}) {
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

    this.#onCheckedChange?.(items, oldItems, options.event);
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
        this.#changeValue(itemElement.dataset.value, { event });
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

        this.#changeCheckedValues(newCheckedValues, { event });
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
