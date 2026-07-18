export class ChipGroup {
  #container;
  #textField;
  #valueField;
  #items;
  #mode;
  #values;
  #onChange;
  #onRenderItem;

  constructor(containerSelector, options = {}) {
    this.#container = document.querySelector(containerSelector);

    if (!this.#container) {
      throw new Error(`container not found: ${containerSelector}`);
    }

    this.#textField = options.textField ?? "text";
    this.#valueField = options.valueField ?? "value";

    this.#items = options.items ?? [];
    this.#validateItems(this.#items);

    this.#mode = options.mode ?? "multiple";

    if (!["single", "multiple"].includes(this.#mode)) {
      throw new Error(`invalid chip group mode: ${this.#mode}`);
    }

    this.#values = this.#filterValidValues(options.values);

    this.#onChange = options.onChange ?? null;
    this.#onRenderItem = options.onRenderItem ?? null;

    this.#container.classList.add("chip-group");

    this.#bindEvents();
    this.#render();
  }

  // #region Public Methods

  async setItems(items = []) {
    this.#validateItems(items);

    if (this.#values.length > 0) {
      await this.#changeValues([]);
    }

    this.#items = items;
    this.#values = [];
    this.#render();
  }

  getItems() {
    return [...this.#items];
  }

  getValues() {
    return [...this.#values];
  }

  async select(values) {
    const filteredValues = this.#filterValidValues(values);
    await this.#changeValues(filteredValues);
  }

  async clear() {
    await this.select([]);
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
    const normalizedValues = Array.isArray(values) ? values : [values];
    const finalValues =
      this.#mode === "single" ? normalizedValues.slice(0, 1) : normalizedValues;

    return finalValues.filter((value) => this.#filterValidValue(value) != null);
  }

  async #changeValues(values, options = {}) {
    const oldValues = this.#values;

    if (this.#compareArrayValues(values, oldValues)) {
      return;
    }

    this.#values = values;

    this.#updateActiveState();

    const items = this.#items.filter((item) =>
      values.includes(item[this.#valueField]),
    );
    const oldItems = this.#items.filter((item) =>
      oldValues.includes(item[this.#valueField]),
    );

    if (this.#mode === "single") {
      await this.#onChange?.(
        items[0] ?? null,
        oldItems[0] ?? null,
        options.event,
      );
    } else {
      await this.#onChange?.(items, oldItems, options.event);
    }
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
      const chip = event.target.closest(".chip-item");

      if (!chip || !this.#container.contains(chip)) {
        return;
      }

      const clickedValue = chip.dataset.value;
      const oldValues = this.#values;
      let newValues = [];

      if (this.#mode === "single") {
        newValues = oldValues.includes(clickedValue) ? [] : [clickedValue];
      } else if (oldValues.includes(clickedValue)) {
        newValues = oldValues.filter((value) => value !== clickedValue);
      } else {
        newValues = [...oldValues, clickedValue];
      }

      this.#changeValues(newValues, { event });
      return;
    });
  }

  #render() {
    this.#container.innerHTML = "";

    for (const item of this.#items) {
      const itemElement = this.#renderItem(item);
      this.#container.appendChild(itemElement);
    }

    this.#updateActiveState();
  }

  #renderItem(item) {
    const itemElement = document.createElement("div");

    itemElement.className = "chip-item";

    const contentElement = this.#onRenderItem
      ? this.#onRenderItem(item)
      : this.#createDefaultContentElement(item);

    if (!(contentElement instanceof HTMLElement)) {
      throw new Error("onRenderItem must return an HTMLElement");
    }

    itemElement.appendChild(contentElement);
    itemElement.dataset.value = item[this.#valueField];

    return itemElement;
  }

  #createDefaultContentElement(item) {
    const textElement = document.createElement("span");

    textElement.textContent = item[this.#textField];

    return textElement;
  }

  #updateActiveState() {
    const itemElements = this.#container.querySelectorAll(".chip-item");

    for (const itemElement of itemElements) {
      const selected = this.#values.includes(itemElement.dataset.value);
      itemElement.classList.toggle("is-selected", selected);
    }
  }

  // #endregion Private Methods
}
