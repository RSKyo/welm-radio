import {
  assertItem,
  assertItems,
  assertValue,
  assertValues,
  filterValue,
  filterValues,
  haveSameValues,
} from "./item.js";

export class ItemList {
  #container;
  #textField;
  #valueField;
  #items;
  #value;
  #checkedValues;
  onSetItems;
  onChange;
  onDoubleClick;
  onCheckedChange;
  onRenderItem;

  #rootClass = "item-list";

  constructor(container, options = {}) {
    if (typeof container === "string") {
      this.#container = document.querySelector(container);
      if (!this.#container) {
        throw new Error(`container not found: ${container}`);
      }
    } else if (container instanceof HTMLElement) {
      this.#container = container;
    } else {
      throw new Error(
        "Invalid container: must be a selector or an HTMLElement",
      );
    }

    this.#container.classList.add(this.#rootClass);

    this.#textField = options.textField ?? "text";
    this.#valueField = options.valueField ?? "value";

    this.#items = [
      ...assertItems(options.items ?? [], this.#textField, this.#valueField),
    ];

    this.#value = assertValue(
      options.value ?? "",
      this.#items,
      this.#valueField,
    );

    this.#checkedValues = assertValues(
      options.checkedValues ?? [],
      this.#items,
      this.#valueField,
    );

    this.onSetItems = options.onSetItems ?? null;
    this.onChange = options.onChange ?? null;
    this.onDoubleClick = options.onDoubleClick ?? null;
    this.onCheckedChange = options.onCheckedChange ?? null;
    this.onRenderItem = options.onRenderItem ?? null;

    this.#bindEvents();
    this.#render();
  }

  // -----------------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------------

  getItems() {
    return this.#items.map((item) => ({ ...item }));
  }

  async setItems(items = []) {
    assertItems(items, this.#textField, this.#valueField);

    this.#items = [...items];
    this.#value = filterValue(this.#value, items, this.#valueField);
    this.#checkedValues = filterValues(
      this.#checkedValues,
      items,
      this.#valueField,
    );

    this.#render();

    await this.onSetItems?.(this.getItems());
  }

  getSelectedItem() {
    if (this.#value === "") {
      return null;
    }

    const item = this.#items.find(
      (item) => item[this.#valueField] === this.#value,
    );
    return { ...item };
  }

  getCheckedItems() {
    if (this.#checkedValues.length === 0) {
      return [];
    }

    const items = this.#items.filter((item) =>
      this.#checkedValues.includes(item[this.#valueField]),
    );

    return items.map((item) => ({ ...item }));
  }

  async updateItem(value, item) {
    assertValue(value, this.#items, this.#valueField);
    assertItem(item, this.#textField, this.#valueField);

    const index = this.#items.findIndex(
      (item) => item[this.#valueField] === value,
    );

    if (index === -1) {
      throw new Error(`item not found: ${value}`);
    }

    const items = [...this.#items];
    items[index] = { ...item };

    if(value === this.#value) {
      this.#value = item[this.#valueField];
    }

    if(this.#checkedValues.includes(value)) {
      const checkedIndex = this.#checkedValues.indexOf(value);
      this.#checkedValues[checkedIndex] = item[this.#valueField];
    }

    await this.setItems(items);
  }

  getValue() {
    return this.#value;
  }

  async setValue(value) {
    const validatedValue = assertValue(value, this.#items, this.#valueField);
    await this.#changeValue(validatedValue);
  }

  async unselect() {
    await this.setValue("");
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
  // change handlers
  // -----------------------------------------------------------------------------

  async #changeValue(value, options = {}) {
    const oldValue = this.#value;

    if (value === oldValue) {
      return;
    }

    this.#value = value;
    this.#updateSelectedState();

    if (this.onChange) {
      const item = this.#items.find((item) => item[this.#valueField] === value);

      const oldItem = this.#items.find(
        (item) => item[this.#valueField] === oldValue,
      );

      await this.onChange(item, oldItem, options.event);
    }
  }

  async #changeCheckedValues(values, options = {}) {
    const oldValues = this.#checkedValues;

    if (haveSameValues(values, oldValues)) {
      return;
    }

    this.#checkedValues = [...values];
    this.#updateCheckedState();

    if (this.onCheckedChange) {
      const items = this.#items.filter((item) =>
        values.includes(item[this.#valueField]),
      );

      const oldItems = this.#items.filter((item) =>
        oldValues.includes(item[this.#valueField]),
      );

      await this.onCheckedChange(items, oldItems, options.event);
    }
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.#container.addEventListener("click", async (event) => {
      const itemElement = event.target.closest(`.${this.#rootClass}-item`);
      if (!itemElement || !this.#container.contains(itemElement)) {
        return;
      }

      const value = itemElement?.dataset.value;

      const itemContentElement = event.target.closest(
        `.${this.#rootClass}-content`,
      );
      if (itemContentElement && this.#container.contains(itemContentElement)) {
        await this.#changeValue(value, { event });
        return;
      }

      const itemCheckboxElement = event.target.closest(
        `.${this.#rootClass}-checkbox`,
      );
      if (
        itemCheckboxElement &&
        this.#container.contains(itemCheckboxElement)
      ) {
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

    this.#container.addEventListener("dblclick", async (event) => {
      const itemElement = event.target.closest(`.${this.#rootClass}-item`);
      if (!itemElement || !this.#container.contains(itemElement)) {
        return;
      }

      const value = itemElement?.dataset.value;

      const itemContentElement = event.target.closest(
        `.${this.#rootClass}-content`,
      );
      if (itemContentElement && this.#container.contains(itemContentElement)) {
        if (this.onDoubleClick) {
          const item = this.#items.find(
            (item) => item[this.#valueField] === value,
          );
          await this.onDoubleClick(item, event);
        }
        return;
      }
    });
  }

  // -----------------------------------------------------------------------------
  // rendering and updating the DOM
  // -----------------------------------------------------------------------------

  #render() {
    this.#container.innerHTML = "";

    if (this.#items.length === 0) {
      const emptyElement = document.createElement("div");
      emptyElement.className = `${this.#rootClass}-empty`;
      emptyElement.textContent = "No items";
      this.#container.appendChild(emptyElement);
      return;
    }

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

    itemElement.className = `${this.#rootClass}-item`;
    checkboxContainer.className = `${this.#rootClass}-check`;
    contentContainer.className = `${this.#rootClass}-content`;

    const checkbox = document.createElement("input");

    checkbox.className = `${this.#rootClass}-checkbox`;
    checkbox.type = "checkbox";
    checkbox.tabIndex = -1;

    checkboxContainer.appendChild(checkbox);

    const contentElement = this.onRenderItem
      ? this.onRenderItem(item)
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
    textElement.className = `${this.#rootClass}-text`;

    textElement.textContent = item[this.#textField];
    textElement.title = item[this.#textField];

    return textElement;
  }

  #updateSelectedState() {
    const itemElements = this.#container.querySelectorAll(
      `.${this.#rootClass}-item`,
    );

    for (const itemElement of itemElements) {
      itemElement.classList.toggle(
        "is-selected",
        itemElement.dataset.value === this.#value,
      );
    }
  }

  #updateCheckedState() {
    const itemElements = this.#container.querySelectorAll(
      `.${this.#rootClass}-item`,
    );

    for (const itemElement of itemElements) {
      const checked = this.#checkedValues.includes(itemElement.dataset.value);
      const checkbox = itemElement.querySelector(
        `.${this.#rootClass}-checkbox`,
      );
      checkbox.checked = checked;
      itemElement.classList.toggle("is-checked", checked);
    }
  }
}
