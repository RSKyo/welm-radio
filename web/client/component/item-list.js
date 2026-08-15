import {
  createElementByHTML,
  validateItemFields,
  filterValue,
  validateModeValue,
  validateValue,
  validateValueExists,
  dispatchItemEvent,
  isEqualValue,
  isNullOrEmpty,
} from "./elm-helper.js";
import { ItemsElm } from "./elm.js";

const DEFAULT_ITEM_ELEMENT_HTML = `
<div class="item-list-item" data-role="item">
  <div class="item-list-check">
    <input type="checkbox" class="item-list-checkbox" data-role="checkbox" tabindex="-1">
  </div>
  <div class="item-list-content" data-role="content">
    <span class="item-list-text" data-role="text"></span>
  </div>
</div>
`;

export class ItemList extends ItemsElm {
  // templates
  #itemElementTemplate;
  // state
  #value;
  #valueMode = 1;
  #checkedValue;
  #checkedValueMode = 2;
  // event
  #onChange;
  #onDblclick;
  #onCheckedChange;

  constructor(root, options = {}) {
    const rootClass = options.rootClass ?? "item-list";

    const dataset = options.dataset ?? {};
    if (options.name != null) {
      dataset.name = options.name;
    }

    super(root, {
      ...options,

      rootClass,
      dataset,
    });

    this.#initTemplates(options);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // templates
  // -----------------------------------------------------------------------------

  #initTemplates(options) {
    const itemElementHTML =
      options.itemElementHTML ?? DEFAULT_ITEM_ELEMENT_HTML;
    this.#itemElementTemplate = createElementByHTML(itemElementHTML);

    if (options.itemElementHTML != null) {
      this.#validateItemElementTemplate(this.#itemElementTemplate);
    }
  }

  #validateItemElementTemplate(element) {
    // querySelector will not match the itemElement itself,
    // so we use matches to check for the itemElement itself
    if (!element.matches('[data-role="item"]')) {
      throw new Error("itemElement must have data-role='item'");
    }

    if (!element.querySelector('[data-role="content"]')) {
      throw new Error(
        "itemElement must have a child element with data-role='content'",
      );
    }

    if (!element.querySelector('[data-role="text"]')) {
      throw new Error(
        "itemElement must have a child element with data-role='text'",
      );
    }

    if (!element.querySelector('[data-role="checkbox"]')) {
      throw new Error(
        "itemElement must have a child element with data-role='checkbox'",
      );
    }
  }

  // -----------------------------------------------------------------------------
  // value
  // -----------------------------------------------------------------------------

  get value() {
    return this.#value;
  }

  getValue() {
    if (this.#value == null) {
      return null;
    }

    if (this.#valueMode === 2) {
      return this.#value.length > 0 ? [...this.#value] : null;
    }

    return this.#value;
  }

  setValue(value) {
    const oldValue = this.#value;

    if (isNullOrEmpty(value)) {
      this.#value = null;
    } else {
      validateModeValue(value, this.#valueMode);
      validateValue(value);
      validateValueExists(value, this.items, this.valueField);

      this.#value = this.#valueMode === 1 ? value : [...value];
    }

    const newValue = this.#value;
    if (!isEqualValue(newValue, oldValue)) {
      this.#updateSelectedState();

      this.#onChange?.({
        target: this,
        value: Array.isArray(newValue) ? [...newValue] : newValue,
        item: this.getItemByValue(newValue),
      });
    }
  }

  // -----------------------------------------------------------------------------
  // checked value
  // -----------------------------------------------------------------------------

  get checkedValue() {
    return this.#checkedValue;
  }

  getCheckedValue() {
    if (this.#checkedValue == null) {
      return null;
    }

    if (this.#checkedValueMode === 2) {
      return this.#checkedValue.length > 0 ? [...this.#checkedValue] : null;
    }

    return this.#checkedValue;
  }

  setCheckedValue(value) {
    const oldValue = this.#checkedValue;

    if (isNullOrEmpty(value)) {
      this.#checkedValue = null;
    } else {
      validateModeValue(value, this.#checkedValueMode);
      validateValue(value);
      validateValueExists(value, this.items, this.valueField);

      this.#checkedValue = this.#checkedValueMode === 1 ? value : [...value];
    }

    const newValue = this.#checkedValue;
    if (!isEqualValue(newValue, oldValue)) {
      this.#updateCheckedState();

      this.#onCheckedChange?.({
        target: this,
        value: Array.isArray(newValue) ? [...newValue] : newValue,
        item: this.getItemByValue(newValue),
      });
    }
  }

  checkAll() {
    const values = this.items.map((item) => item[this.valueField]);
    this.setCheckedValue(values);
  }

  uncheckAll() {
    this.setCheckedValue(null);
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

  set onChange(handler) {
    // handler can be null to remove the event listener
    this.#onChange = handler == null ? null : handler;
  }

  set onDblclick(handler) {
    // handler can be null to remove the event listener
    this.#onDblclick = handler == null ? null : handler;
  }

  set onCheckedChange(handler) {
    // handler can be null to remove the event listener
    this.#onCheckedChange = handler == null ? null : handler;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
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
      this.#onDblclick?.({
        target: this,
        value,
        item: this.getItemByValue(value),
      });
    };

    this.rootElement.addEventListener("click", (event) => {
      dispatchItemEvent('[data-role="content"]', event, clickContentHandler);

      dispatchItemEvent('[data-role="checkbox"]', event, clickCheckboxHandler);
    });

    this.rootElement.addEventListener("dblclick", (event) => {
      dispatchItemEvent('[data-role="item"]', event, dblclickContentHandler);
    });
  }

  // -----------------------------------------------------------------------------
  // rendering and updating the DOM
  // -----------------------------------------------------------------------------

  // override
  createItemElement(item) {
    const text = item[this.textField];
    const value = item[this.valueField];
    const tooltip = item[this.tooltipField];

    const itemElement = this.#itemElementTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text;
    itemElement.title = tooltip || text || "";

    return itemElement;
  }

  // override
  afterRender(items) {
    if (isNullOrEmpty(items)) {
      this.#value = null;
      this.#checkedValue = null;
    } else {
      this.#value = filterValue(this.#value, items, this.valueField);
      this.#checkedValue = filterValue(
        this.#checkedValue,
        items,
        this.valueField,
      );

      this.#updateState();
    }
  }

  // override
  afterUpdateItem(newItem) {
    this.#updateState();
  }

  #updateState() {
    this.#updateSelectedState();
    this.#updateCheckedState();
  }

  #updateSelectedState() {
    this.root.each((key, element) => {
      if (this.#valueMode === 1) {
        element.classList.toggle("is-selected", this.#value === key);
      } else if (this.#valueMode === 2) {
        element.classList.toggle(
          "is-selected",
          this.#value?.includes(key) ?? false,
        );
      }
    });
  }

  #updateCheckedState() {
    this.root.each((key, element) => {
      const checked =
        this.#checkedValue?.includes(element.dataset.value) ?? false;
      const checkbox = element.querySelector('[data-role="checkbox"]');
      checkbox.checked = checked;
      element.classList.toggle("is-checked", checked);
    });
  }
}
