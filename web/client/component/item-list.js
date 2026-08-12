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
export class ItemList {
  #rootClass = "item-list";
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
  #itemElementMap;

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
    this.#itemElementMap = new Map();

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
      this.#render(this.#items);
      return;
    }

    if (!this.#textField || !this.#valueField || !this.#tooltipField) {
      const { textField, valueField, tooltipField } = detectFields(items);
      this.#textField = textField;
      this.#valueField = valueField;
      this.#tooltipField = tooltipField;
    }

    validateItems(items, this.#valueField);
    this.#items = items.map((item) => ({ ...item }));

    this.#value = filterValue(this.#value, this.#items, this.#valueField);
    this.#checkedValue = filterValue(
      this.#checkedValue,
      this.#items,
      this.#valueField,
    );

    this.#render(this.#items);

    this.#onSetItems?.(this.#items);
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
    this.#updateItemElement(newItem);
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
    const values = this.#items.map((item) => item[this.#valueField]);
    this.setCheckedValue(values);
  }

  uncheckAll() {
    this.setCheckedValue(null);
  }

  // -----------------------------------------------------------------------------
  // events
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
    this.#onRenderItem = safeHandler(handler);
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    const handleClosest = (selector, event, handler) => {
      const target = event.target.closest(selector);
      if (!target || !event.currentTarget.contains(target)) {
        return;
      }

      const itemElement = target.closest('[data-role="item"]');
      if (!itemElement || !event.currentTarget.contains(itemElement)) {
        return;
      }

      handler({
        event,
        target,
        itemElement,
        value: itemElement.dataset.value,
      });
    };

    const clickContentHandler = ({ value }) => {
      this.setValue(value);
    };

    const clickCheckboxHandler = ({ value }) => {
      const oldValue = this.#checkedValue ?? [];

      const newValue = oldValue.includes(value)
        ? oldValue.filter((v) => v !== value)
        : [...oldValue, value];

      this.setCheckedValue(newValue);
    };

    const dblclickContentHandler = ({ value, event }) => {
      if (this.#onDoubleClick) {
        const item = this.getItemByValue(value);
        this.#onDoubleClick(item, event);
      }
    };

    this.#root.addEventListener("click", (event) => {
      handleClosest('[data-role="content"]', event, clickContentHandler);

      handleClosest('[data-role="checkbox"]', event, clickCheckboxHandler);
    });

    this.#root.addEventListener("dblclick", (event) => {
      handleClosest('[data-role="content"]', event, dblclickContentHandler);
    });
  }

  // -----------------------------------------------------------------------------
  // rendering and updating the DOM
  // -----------------------------------------------------------------------------

  #render(items) {
    this.#root.innerHTML = "";
    this.#itemElementMap.clear();

    if (items.length === 0) {
      const emptyTemplate = `<div class="item-list-empty">No items</div>`;
      const emptyElement = this.#createElementByTemplate(emptyTemplate);
      this.#root.appendChild(emptyElement);
      return;
    }

    for (const item of items) {
      const itemElement = this.#createItemElement(item);
      this.#root.appendChild(itemElement);
      this.#itemElementMap.set(item[this.#valueField], itemElement);
    }

    this.#updateSelectedState();
    this.#updateCheckedState();
  }

  #createItemElement(item) {
    const itemTemplate = `<div class="item-list-item" data-role="item">
      <div class="item-list-check">
        <input type="checkbox" class="item-list-checkbox" data-role="checkbox" tabindex="-1">
      </div>
      <div class="item-list-content" data-role="content"></div>
    </div>`;

    const itemElement = this.#createElementByTemplate(itemTemplate);
    itemElement.dataset.value = item[this.#valueField];

    const contentContainer = itemElement.querySelector("[data-role='content']");

    const contentElement =
      this.#onRenderItem?.(item) ?? this.#createDefaultContentElement(item);

    if (!(contentElement instanceof HTMLElement)) {
      throw new Error("onRenderItem must return an HTMLElement");
    }

    contentContainer.appendChild(contentElement);

    return itemElement;
  }

  #createDefaultContentElement(item) {
    const contentTemplate = `
      <span class="item-list-text"></span>
    `;

    const contentElement = this.#createElementByTemplate(contentTemplate);
    contentElement.textContent = item[this.#textField];
    contentElement.title = item[this.#tooltipField] || item[this.#textField];
    return contentElement;
  }

  #createElementByTemplate(templateString) {
    const template = document.createElement("template");
    template.innerHTML = templateString.trim();
    return template.content.firstElementChild;
  }

  #updateItemElement(item) {
    const value = item[this.#valueField];
    const oldElement = this.#itemElementMap.get(value);
    if (!oldElement) {
      throw new Error(`element not found: ${value}`);
    }

    const newElement = this.#createItemElement(item);
    oldElement.replaceWith(newElement);
    
    this.#itemElementMap.delete(value);
    this.#itemElementMap.set(value, newElement);
  }

  #updateSelectedState() {
    const itemElements = this.#getItemElements();

    for (const itemElement of itemElements) {
      itemElement.classList.toggle(
        "is-selected",
        itemElement.dataset.value === this.#value,
      );
    }
  }

  #updateCheckedState() {
    const itemElements = this.#getItemElements();

    for (const itemElement of itemElements) {
      const checked =
        this.#checkedValue?.includes(itemElement.dataset.value) ?? false;
      const checkbox = itemElement.querySelector('[data-role="checkbox"]');
      checkbox.checked = checked;
      itemElement.classList.toggle("is-checked", checked);
    }
  }
}
