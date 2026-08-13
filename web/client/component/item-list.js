import {
  safeHandler,
  createElementByHTML,
  detectFields,
  validateItems,
  validateItem,
  filterValue,
  validateModeValue,
  validateValue,
  validateValueExists,
  isEqualValue,
} from "./elm-helper.js";
import { Elm } from "./elm.js";

const defaultEmptyElementHTML = `<div class="item-list-empty">No items</div>`;
const defaultItemElementHTML = `
<div class="item-list-item" data-role="item">
  <div class="item-list-check">
    <input type="checkbox" class="item-list-checkbox" data-role="checkbox" tabindex="-1">
  </div>
  <div class="item-list-content" data-role="content">
    <span class="item-list-text" data-role="text"></span>
  </div>
</div>
`;

export class ItemList extends Elm {
  // fields
  #textField;
  #valueField;
  #tooltipField;
  // data and state
  #items;
  #value;
  #valueMode;
  #checkedValue;
  #checkedValueMode;
  // events
  #onSetItems;
  #onClick;
  #onDoubleClick;
  #onCheckedChange;
  #onRender;
  #onRenderItem;
  // templates
  #emptyElementHTML;
  #emptyElementTemplate;
  #itemElementHTML;
  #itemElementTemplate;

  constructor(root, options = {}) {
    super(root, "item-list", { name: "item-list" });

    // fields
    this.#textField = options.textField ?? null;
    this.#valueField = options.valueField ?? null;
    this.#tooltipField = options.tooltipField ?? null;
    // data and state
    this.#items = [];
    this.#value = null;
    this.#valueMode = 1;
    this.#checkedValue = null;
    this.#checkedValueMode = 2;
    // events
    this.#onSetItems = null;
    this.#onClick = null;
    this.#onDoubleClick = null;
    this.#onCheckedChange = null;
    this.#onRender = null;
    this.#onRenderItem = null;
    // templates
    this.#emptyElementHTML = defaultEmptyElementHTML;
    this.#emptyElementTemplate = createElementByHTML(this.#emptyElementHTML);
    this.#itemElementHTML = defaultItemElementHTML;
    this.#itemElementTemplate = createElementByHTML(this.#itemElementHTML);

    this.#bindEvents();
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

    this.#textField ??= detectedFields.textField;
    this.#valueField ??= detectedFields.valueField;
    this.#tooltipField ??= detectedFields.tooltipField;

    validateItems(items, this.#valueField);
    this.#items = items.map((item) => ({ ...item }));

    this.#value = filterValue(this.#value, this.#items, this.#valueField);
    this.#checkedValue = filterValue(
      this.#checkedValue,
      this.#items,
      this.#valueField,
    );

    this.#render(this.#items);

    this.#onSetItems?.({
      target: this,
      items: this.items,
    });
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

    const newItemElement = this.#createItemElement(newItem);
    this.root.replace(newItem[this.#valueField], newItemElement);
  }

  getItemByValue(value) {
    if (value == null) {
      return null;
    }

    validateValue(value);
    validateValueExists(value, this.#items, this.#valueField);

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
      return this.#value.length > 0 ? [...this.#value] : null;
    }

    return this.#value;
  }

  setValue(value) {
    if (value == null) {
      this.#value = null;
      this.#updateSelectedState(null);
      return;
    }

    validateModeValue(value, this.#valueMode);
    validateValue(value);
    validateValueExists(value, this.#items, this.#valueField);

    const oldValue = this.#value;
    this.#value = this.#valueMode === 1 ? value : [...value];

    if (!isEqualValue(value, oldValue)) {
      this.#updateSelectedState(value);

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
      return this.#checkedValue.length > 0 ? [...this.#checkedValue] : null;
    }

    return this.#checkedValue;
  }

  setCheckedValue(value) {
    if (value == null) {
      this.#checkedValue = null;
      this.#updateCheckedState(null);
      return;
    }

    validateModeValue(value, this.#checkedValueMode);
    validateValue(value);
    validateValueExists(value, this.#items, this.#valueField);

    const oldValue = this.#checkedValue;
    this.#checkedValue = this.#checkedValueMode === 1 ? value : [...value];

    if (!isEqualValue(value, oldValue)) {
      this.#updateCheckedState(value);

      this.#onCheckedChange?.({
        target: this,
        value: Array.isArray(value) ? [...value] : value,
        item: this.getItemByValue(value),
      });
    }
  }

  checkAll() {
    const values = this.#items.map((item) => item[this.#valueField]);
    this.setCheckedValue(values.length > 0 ? values : null);
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

  set onRender(handler) {
    this.#onRender = safeHandler(handler);
  }

  set onRenderItem(handler) {
    this.#onRenderItem = safeHandler(handler);
  }

  get emptyElementHTML() {
    return this.#emptyElementHTML;
  }

  set emptyElementHTML(html) {
    this.#emptyElementHTML = html;
    this.#emptyElementTemplate = createElementByHTML(this.#emptyElementHTML);
  }

  get itemElementHTML() {
    return this.#itemElementHTML;
  }

  set itemElementHTML(html) {
    this.#itemElementHTML = html;
    this.#itemElementTemplate = createElementByHTML(this.#itemElementHTML);
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
        element: itemElement,
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

    const dblclickContentHandler = ({ value }) => {
      if (this.#onDoubleClick) {
        this.#onDoubleClick({
          target: this,
          value,
          item: this.getItemByValue(value),
        });
      }
    };

    this.rootElement.addEventListener("click", (event) => {
      handleClosest('[data-role="content"]', event, clickContentHandler);

      handleClosest('[data-role="checkbox"]', event, clickCheckboxHandler);
    });

    this.rootElement.addEventListener("dblclick", (event) => {
      handleClosest('[data-role="content"]', event, dblclickContentHandler);
    });
  }

  // -----------------------------------------------------------------------------
  // rendering and updating the DOM
  // -----------------------------------------------------------------------------

  #render(items) {
    this.#onRender?.({
      target: this,
      items: this.items,
      rootElement: this.rootElement,
    });

    this.root.clear();

    if (items.length === 0) {
      this.root.add("empty", this.#emptyElementTemplate.cloneNode(true));
      return;
    }

    for (const item of items) {
      const itemElement = this.#createItemElement(item);
      this.root.add(item[this.#valueField], itemElement);
    }

    this.#updateSelectedState();
    this.#updateCheckedState();
  }

  #createItemElement(item) {
    const text = item[this.#textField];
    const value = item[this.#valueField];

    const itemElement = this.#itemElementTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text;

    const customItemElement = this.#onRenderItem?.({
      target: this,
      item: { ...item },
      itemElement: itemElement.cloneNode(true),
    });

    return customItemElement instanceof HTMLElement
      ? customItemElement
      : itemElement;
  }

  #updateSelectedState() {
    for (const element of this.root.elements()) {
      element.classList.toggle(
        "is-selected",
        element.dataset.value === this.#value,
      );
    }
  }

  #updateCheckedState() {
    for (const element of this.root.elements()) {
      const checked =
        this.#checkedValue?.includes(element.dataset.value) ?? false;
      const checkbox = element.querySelector('[data-role="checkbox"]');
      checkbox.checked = checked;
      element.classList.toggle("is-checked", checked);
    }
  }
}
