import { CollectionElm } from "./elm.js";
import {
  prepareRootElement,
  assertValues,
  filterValues,
  haveSameValues,
} from "./helper.js";
export class ChipGroup extends CollectionElm {
  #mode;
  #values;
  onSetItems;
  onSelect;
  onRenderItem;

  

  constructor(root, options = {}) {
    super(root, { rootClass: "chip-group" });

    this.textField = options.textField ?? null;
    this.valueField = options.valueField ?? null;
    this.titleField = options.titleField ?? null;
    this.#mode = options.mode ?? "multiple";

    if (!["single", "multiple"].includes(this.#mode)) {
      throw new Error("mode must be either 'single' or 'multiple'");
    }

    this.#values = [];
    this.onSetItems = options.onSetItems ?? null;
    this.onSelect = options.onSelect ?? null;
    this.onRenderItem = options.onRenderItem ?? null;

    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------------

  setItems(items = []) {
    this.items = [...items];

    this.#values = filterValues(this.#values, items, this.valueField);

    this.#render();

    this.onSetItems?.(this.getItems());
  }

  getValues() {
    return [...this.#values];
  }

  setValues(values) {
    if (this.#mode === "single" && values.length > 1) {
      throw new Error("single mode accepts at most one value");
    }

    const validatedValues = assertValues(values, this.items, this.valueField);
    this.#changeValues(validatedValues);
  }

  selectAll() {
    if (this.#mode === "single") {
      throw new Error("selectAll is only available in multiple mode");
    }

    const allValues = this.items.map((item) => item[this.valueField]);
    this.#changeValues(allValues);
  }

  unselect() {
    this.#changeValues([]);
  }

  // -----------------------------------------------------------------------------
  // change handlers
  // -----------------------------------------------------------------------------

  #changeValues(values, options = {}) {
    const oldValues = this.#values;

    if (haveSameValues(values, oldValues)) {
      return;
    }

    this.#values = [...values];
    this.#updateSelectedState();

    if (this.onSelect) {
      const items = this.items.filter((item) =>
        values.includes(item[this.valueField]),
      );

      this.onSelect({
        target: this,
        mode: this.#mode,
        values,
        items,
        event: options.event ?? null,
      });
    }
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.root.addEventListener("click", (event) => {
      // click on an item
      const itemElement = event.target.closest(`.${this.rootClass}-item`);
      if (itemElement && this.root.contains(itemElement)) {
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

        this.#changeValues(newValues, { event });

        return;
      }

      // click on an action button
      const actionElement = event.target.closest(`.${this.rootClass}-action`);
      if (actionElement && this.root.contains(actionElement)) {
        if (actionElement.dataset.action === "select-all") {
          this.selectAll();
        } else {
          this.unselect();
        }

        return;
      }
    });
  }

  // -----------------------------------------------------------------------------
  // rendering and updating the DOM
  // -----------------------------------------------------------------------------

  #render() {
    this.root.innerHTML = "";

    for (const item of this.items) {
      const itemElement = this.#renderItem(item);
      this.root.appendChild(itemElement);
    }

    if (this.#mode === "multiple") {
      this.root.appendChild(this.#renderSelectActions());
    }

    this.#updateSelectedState();
  }

  #renderItem(item) {
    const itemElement = document.createElement("div");

    itemElement.className = `${this.rootClass}-item`;

    const contentElement = this.onRenderItem
      ? this.onRenderItem(item)
      : this.#createDefaultContentElement(item);

    if (!(contentElement instanceof HTMLElement)) {
      throw new Error("onRenderItem must return an HTMLElement");
    }

    itemElement.appendChild(contentElement);
    itemElement.dataset.value = item[this.valueField];

    return itemElement;
  }

  #renderSelectActions() {
    const actionsElement = document.createElement("div");
    actionsElement.className = `${this.rootClass}-actions`;

    const selectAllButton = document.createElement("button");
    selectAllButton.type = "button";
    selectAllButton.className = `${this.rootClass}-action`;
    selectAllButton.dataset.action = "select-all";
    selectAllButton.textContent = "全选";

    const unselectButton = document.createElement("button");
    unselectButton.type = "button";
    unselectButton.className = `${this.rootClass}-action`;
    unselectButton.dataset.action = "unselect";
    unselectButton.textContent = "取消";

    actionsElement.append(selectAllButton, unselectButton);

    return actionsElement;
  }

  #createDefaultContentElement(item) {
    const textElement = document.createElement("span");

    textElement.textContent = item[this.textField];
    textElement.className = `${this.rootClass}-text`;
    textElement.title = item[this.titleField] || item[this.textField];

    return textElement;
  }

  #updateSelectedState() {
    const itemElements = this.root.querySelectorAll(
      `.${this.rootClass}-item`,
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
