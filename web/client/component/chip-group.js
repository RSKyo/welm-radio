import {
  assertItems,
  assertValue,
  assertValues,
  filterValues,
  haveSameValues,
} from "./item.js";

const text_field_candidates = ["text", "label", "name"];
const value_field_candidates = ["value", "id"];
const title_field_candidates = [
  "title",
  "description",
  "text",
  "label",
  "name",
];
export class ChipGroup {
  #container;
  #textField;
  #valueField;
  #titleField;
  #showSelectActions;
  #items;
  #mode;
  #values;
  onSetItems;
  onChange;
  onRenderItem;

  #rootClass = "chip-group";

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

    this.#textField = options.textField ?? null;
    this.#valueField = options.valueField ?? null;
    this.#titleField = options.titleField ?? null;

    this.#showSelectActions = options.showSelectActions ?? false;

    const items = options.items ?? [];

    this.#resolveFields(items);

    this.#items = [...assertItems(items, this.#textField, this.#valueField)];

    this.#resolveFields(items);

    this.#mode = options.mode ?? "multiple";

    if (!["single", "multiple"].includes(this.#mode)) {
      throw new Error("mode must be either 'single' or 'multiple'");
    }

    this.#values = assertValues(
      options.values ?? [],
      this.#items,
      this.#valueField,
    );

    if (this.#mode === "single" && this.#values.length > 1) {
      throw new Error("single mode accepts at most one value");
    }

    this.onSetItems = options.onSetItems ?? null;
    this.onChange = options.onChange ?? null;
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
    this.#resolveFields(items);

    assertItems(items, this.#textField, this.#valueField);

    this.#items = [...items];
    this.#values = filterValues(this.#values, items, this.#valueField);

    this.#render();

    await this.onSetItems?.(this.getItems());
  }

  getValue() {
    if (this.#mode === "multiple") {
      throw new Error("getValue is only available in single mode");
    }
    return this.#values[0] ?? "";
  }

  getValues() {
    if (this.#mode === "single") {
      throw new Error("getValues is only available in multiple mode");
    }
    return [...this.#values];
  }

  async setValue(value) {
    if (this.#mode === "multiple") {
      throw new Error("setValue is only available in single mode");
    }

    const validatedValue = assertValue(value, this.#items, this.#valueField);
    await this.#changeValues(validatedValue ? [validatedValue] : []);
  }

  async setValues(values) {
    if (this.#mode === "single") {
      throw new Error("setValues is only available in multiple mode");
    }

    const validatedValues = assertValues(values, this.#items, this.#valueField);
    await this.#changeValues(validatedValues);
  }

  async selectAll() {
    if (this.#mode === "single") {
      throw new Error("selectAll is only available in multiple mode");
    }

    const allValues = this.#items.map((item) => item[this.#valueField]);
    await this.#changeValues(allValues);
  }

  async unselect() {
    if (this.#mode === "single") {
      throw new Error("unselect is only available in multiple mode");
    }

    await this.#changeValues([]);
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

  async #changeValues(values, options = {}) {
    const oldValues = this.#values;

    if (haveSameValues(values, oldValues)) {
      return;
    }

    this.#values = [...values];
    this.#updateSelectedState();

    if (this.onChange) {
      const items = this.#items.filter((item) =>
        values.includes(item[this.#valueField]),
      );

      const oldItems = this.#items.filter((item) =>
        oldValues.includes(item[this.#valueField]),
      );

      if (this.#mode === "single") {
        await this.onChange(items[0] ?? "", oldItems[0] ?? "", options.event);
      } else {
        await this.onChange(items, oldItems, options.event);
      }
    }
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.#container.addEventListener("click", async (event) => {
      // click on an item
      const itemElement = event.target.closest(`.${this.#rootClass}-item`);
      if (itemElement && this.#container.contains(itemElement)) {
        const value = itemElement.dataset.value;
        const oldValues = this.#values;
        let newValues = [];

        if (this.#mode === "single") {
          newValues = oldValues.includes(value) ? [] : [value];
        } else if (oldValues.includes(value)) {
          newValues = oldValues.filter((v) => v !== value);
        } else {
          newValues = [...oldValues, value];
        }

        await this.#changeValues(newValues, { event });

        return;
      }

      // click on an action button
      const actionElement = event.target.closest(`.${this.#rootClass}-action`);
      if (actionElement && this.#container.contains(actionElement)) {
        if (actionElement.dataset.action === "select-all") {
          await this.selectAll();
        } else {
          await this.unselect();
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

    for (const item of this.#items) {
      const itemElement = this.#renderItem(item);
      this.#container.appendChild(itemElement);
    }

    if (this.#mode === "multiple" && this.#showSelectActions) {
      this.#container.appendChild(this.#renderSelectActions());
    }

    this.#updateSelectedState();
  }

  #renderItem(item) {
    const itemElement = document.createElement("div");

    itemElement.className = `${this.#rootClass}-item`;

    const contentElement = this.onRenderItem
      ? this.onRenderItem(item)
      : this.#createDefaultContentElement(item);

    if (!(contentElement instanceof HTMLElement)) {
      throw new Error("onRenderItem must return an HTMLElement");
    }

    itemElement.appendChild(contentElement);
    itemElement.dataset.value = item[this.#valueField];

    return itemElement;
  }

  #renderSelectActions() {
    const actionsElement = document.createElement("div");
    actionsElement.className = `${this.#rootClass}-actions`;

    const selectAllButton = document.createElement("button");
    selectAllButton.type = "button";
    selectAllButton.className = `${this.#rootClass}-action`;
    selectAllButton.dataset.action = "select-all";
    selectAllButton.textContent = "全选";

    const unselectButton = document.createElement("button");
    unselectButton.type = "button";
    unselectButton.className = `${this.#rootClass}-action`;
    unselectButton.dataset.action = "unselect";
    unselectButton.textContent = "取消";

    actionsElement.append(selectAllButton, unselectButton);

    return actionsElement;
  }

  #createDefaultContentElement(item) {
    const textElement = document.createElement("span");

    textElement.textContent = item[this.#textField];
    textElement.className = `${this.#rootClass}-text`;
    textElement.title = item[this.#titleField] || item[this.#textField];

    return textElement;
  }

  #updateSelectedState() {
    const itemElements = this.#container.querySelectorAll(
      `.${this.#rootClass}-item`,
    );

    for (const itemElement of itemElements) {
      const selected = this.#values.includes(itemElement.dataset.value);
      itemElement.classList.toggle("is-selected", selected);
    }
  }
}


export class SoloChipGroup extends ChipGroup {
  constructor(container, options = {}) {
    super(container, {
      ...options,
      mode: "single",
    });
  }
}

export class MultiChipGroup extends ChipGroup {
  constructor(container, options = {}) {
    super(container, {
      ...options,
      mode: "multiple",
    });
  }
}