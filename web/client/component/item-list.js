import {
  prepareRootElement,
  assertItem,
  assertItems,
  assertValue,
  assertValues,
  filterValue,
  filterValues,
  haveSameValues,
} from "./helper.js";

const text_field_candidates = ["text", "label", "name"];
const value_field_candidates = ["value", "id"];
const title_field_candidates = [
  "title",
  "description",
  "text",
  "label",
  "name",
];

export class ItemList {
  #container;
  #textField;
  #valueField;
  #titleField;
  #items;
  #value;
  #checkedValues;
  onSetItems;
  onClick;
  onDoubleClick;
  onCheckedChange;
  onRenderItem;

  #rootClass = "item-list";

  constructor(container, options = {}) {
    this.#container = prepareRootElement(container, this.#rootClass);
    this.#textField = options.textField ?? null;
    this.#valueField = options.valueField ?? null;
    this.#titleField = options.titleField ?? null;
    this.#items = [];
    this.#value = options.value ?? null;
    this.#checkedValues = options.checkedValues ?? [];
    this.onSetItems = options.onSetItems ?? null;
    this.onClick = options.onClick ?? null;
    this.onDoubleClick = options.onDoubleClick ?? null;
    this.onCheckedChange = options.onCheckedChange ?? null;
    this.onRenderItem = options.onRenderItem ?? null;

    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------------

  get dataset() {
    return this.#container.dataset;
  }

  getItems() {
    return this.#items.map((item) => ({ ...item }));
  }

  setItems(items = []) {
    this.#resolveFields(items);

    assertItems(items, this.#textField, this.#valueField);

    this.#items = [...items];
    this.#value = filterValue(this.#value, items, this.#valueField);
    this.#checkedValues = filterValues(
      this.#checkedValues,
      items,
      this.#valueField,
    );

    this.#render();

    this.onSetItems?.(this.getItems());
  }

  getValue() {
    return this.#value;
  }

  setValue(value) {
    const validatedValue = assertValue(value, this.#items, this.#valueField);
    this.#changeValue(validatedValue);
  }

  getItem() {
    if (this.#value == null) {
      return null;
    }

    const item = this.#items.find(
      (item) => item[this.#valueField] === this.#value,
    );
    return { ...item };
  }

  updateItem(value, item) {
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

    if (value === this.#value) {
      this.#value = item[this.#valueField];
    }

    if (this.#checkedValues.includes(value)) {
      const checkedIndex = this.#checkedValues.indexOf(value);
      this.#checkedValues[checkedIndex] = item[this.#valueField];
    }

    this.setItems(items);
  }

  getCheckedValues() {
    return [...this.#checkedValues];
  }

  setCheckedValues(values) {
    const validatedValues = assertValues(values, this.#items, this.#valueField);
    this.#changeCheckedValues(validatedValues);
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

  checkAll() {
    const allValues = this.#items.map((item) => item[this.#valueField]);
    this.#changeCheckedValues(allValues);
  }

  uncheckAll() {
    this.#changeCheckedValues([]);
  }

  // -----------------------------------------------------------------------------
  // field resolution
  // -----------------------------------------------------------------------------

  #resolveFields(items) {
    const item = items[0];

    if (!item) {
      return;
    }

    if (!this.#textField) {
      this.#textField = this.#findField(item, text_field_candidates);
    }

    if (!this.#valueField) {
      this.#valueField = this.#findField(item, value_field_candidates);
    }

    if (!this.#titleField) {
      this.#titleField = this.#findField(item, title_field_candidates);
    }
  }

  #findField(item, fields) {
    return fields.find((field) => Object.hasOwn(item, field));
  }

  // -----------------------------------------------------------------------------
  // change handlers
  // -----------------------------------------------------------------------------

  #changeValue(value, options = {}) {
    const oldValue = this.#value;

    if (value === oldValue) {
      return;
    }

    this.#value = value;
    this.#updateSelectedState();

    if (this.onClick) {
      const item = this.#items.find((item) => item[this.#valueField] === value);

      this.onClick({
        target: this,
        value,
        item,
        event: options.event ?? null,
      });
    }
  }

  #changeCheckedValues(checkedValues, options = {}) {
    const oldCheckedValues = this.#checkedValues;

    if (haveSameValues(checkedValues, oldCheckedValues)) {
      return;
    }

    this.#checkedValues = [...checkedValues];
    this.#updateCheckedState();

    if (this.onCheckedChange) {
      const checkedItems = this.#items.filter((item) =>
        checkedValues.includes(item[this.#valueField]),
      );

      const oldCheckedItems = this.#items.filter((item) =>
        oldCheckedValues.includes(item[this.#valueField]),
      );

      this.onCheckedChange({
        target: this,
        checkedValues,
        checkedItems,
        oldCheckedValues,
        oldCheckedItems,
        event: options.event ?? null,
      });
    }
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.#container.addEventListener("click", (event) => {
      const itemElement = event.target.closest(`.${this.#rootClass}-item`);
      if (!itemElement || !this.#container.contains(itemElement)) {
        return;
      }

      const value = itemElement?.dataset.value;

      const itemContentElement = event.target.closest(
        `.${this.#rootClass}-content`,
      );
      if (itemContentElement && this.#container.contains(itemContentElement)) {
        this.#changeValue(value, { event });
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

        this.#changeCheckedValues(newCheckedValues, { event });
        return;
      }
    });

    this.#container.addEventListener("dblclick", (event) => {
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
          this.onDoubleClick(item, event);
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
    textElement.title = item[this.#titleField] || item[this.#textField];

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
