import { CollectionElm } from "./elm.js";
import {
  safeHandler,
  haveSameValues,
  validateValues,
  filterValue,
} from "./helper.js";
export class ItemList extends CollectionElm {
  #titleField;
  #checkedValues;
  #onSetItems;
  #onClick;
  #onDoubleClick;
  #onCheckedChange;
  #onRenderItem;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: "item-list",
      valueMode: "single",
    });

    this.#titleField = options.titleField ?? "title";
    this.#checkedValues = [];

    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------------

  set onSetItems(handler) {
    this.#onSetItems = safeHandler(handler);
  }

  set onClick(handler) {
    this.#onClick = safeHandler(handler);
  }

  set onDoubleClick(handler) {
    this.#onDoubleClick = safeHandler(handler);
  }

  set onCheckedChange(handler) {
    this.#onCheckedChange = safeHandler(handler);
  }

  set onRenderItem(handler) {
    this.#onRenderItem = handler;
  }

  setItems(items) {
    super.setItems(items);

    this.#checkedValues = filterValue(
      this.#checkedValues,
      this.items,
      this.valueField,
    );

    this.#render(this.items);

    this.#onSetItems?.(this.items);
  }

  setValue(value) {
    const oldValue = this.value;
    super.setValue(value);

    if (this.value !== oldValue) {
      this.#updateSelectedState();

      this.#onClick?.({
        target: this,
        value: this.value,
        item: this.item,
      });
    }
  }

  get checkedValues() {
    return [...this.#checkedValues];
  }

  setCheckedValues(values = []) {
    validateValues(values, this.items, this.valueField);

    const oldCheckedValues = this.#checkedValues;

    this.#checkedValues = [...values];

    if (!haveSameValues(this.#checkedValues, oldCheckedValues)) {
      this.#updateCheckedState();

      const checkedItems = this.items.filter((item) =>
        this.#checkedValues.includes(item[this.valueField]),
      );

      this.#onCheckedChange?.({
        target: this,
        checkedValues: this.#checkedValues,
        checkedItems,
      });
    }
  }

  checkAll() {
    const allValues = this.items.map((item) => item[this.valueField]);
    this.setCheckedValues(allValues);
  }

  uncheckAll() {
    this.setCheckedValues([]);
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.root.addEventListener("click", (event) => {
      const itemElement = event.target.closest(`.${this.rootClass}-item`);
      const value = itemElement?.dataset.value;

      this.#closestHandler(event, `.${this.rootClass}-content`, () => {
        if (value === this.value) {
          return;
        }
        this.setValue(value);
      });

      this.#closestHandler(event, `.${this.rootClass}-checkbox`, () => {
        const oldCheckedValues = this.#checkedValues;
        let newCheckedValues = [];

        if (oldCheckedValues.includes(value)) {
          newCheckedValues = oldCheckedValues.filter((v) => v !== value);
        } else {
          newCheckedValues = [...oldCheckedValues, value];
        }

        this.setCheckedValues(newCheckedValues);
      });
    });

    this.root.addEventListener("dblclick", (event) => {
      const itemElement = event.target.closest(`.${this.rootClass}-item`);
      const value = itemElement?.dataset.value;

      this.#closestHandler(event, `.${this.rootClass}-content`, () => {
        if (this.#onDoubleClick) {
          const item = this.items.find(
            (item) => item[this.valueField] === value,
          );
          this.#onDoubleClick(item, event);
        }
      });
    });
  }

  #closestHandler(event, selector, handler) {
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
      emptyElement.className = `${this.rootClass}-empty`;
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

    itemElement.className = `${this.rootClass}-item`;
    checkboxContainer.className = `${this.rootClass}-check`;
    contentContainer.className = `${this.rootClass}-content`;

    const checkbox = document.createElement("input");

    checkbox.className = `${this.rootClass}-checkbox`;
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
    textElement.className = `${this.rootClass}-text`;

    textElement.textContent = item[this.textField];
    textElement.title = item[this.titleField] || item[this.textField];

    return textElement;
  }

  #updateSelectedState() {
    const itemElements = this.root.querySelectorAll(`.${this.rootClass}-item`);

    for (const itemElement of itemElements) {
      itemElement.classList.toggle(
        "is-selected",
        itemElement.dataset.value === this.#value,
      );
    }
  }

  #updateCheckedState() {
    const itemElements = this.root.querySelectorAll(`.${this.rootClass}-item`);

    for (const itemElement of itemElements) {
      const checked = this.#checkedValues.includes(itemElement.dataset.value);
      const checkbox = itemElement.querySelector(`.${this.rootClass}-checkbox`);
      checkbox.checked = checked;
      itemElement.classList.toggle("is-checked", checked);
    }
  }
}
