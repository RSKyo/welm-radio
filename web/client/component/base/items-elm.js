import { Elm } from "./elm.js";
import {
  isNullishOrEmpty,
  assertNonBlankString,
  assertNonEmptyNonBlankStringArray,
  assertNonBlankStringOrNonEmptyArray,
  assertPlainObjectArray,
  assertPlainObjectOrNonEmptyArray,
  assertNoDuplicateValues,
  assertNoDuplicatePlainObjectValues,
  assertValueExists,
  assertValueNotExists,
  assertHtmlElement,
  assertFunction,
  assertKeyExists,
} from "./assert.js";

const RESERVED_KEYS = ["__root__", "__empty__", "__header__", "__footer__"];

export class ItemsElm extends Elm {
  #textField = "text";
  #valueField = "value";
  #tooltipField = "tooltip";
  #items = [];

  constructor(root, options = {}) {
    super(root, options);
    this.#init(options);
  }

  init(root, options = {}) {
    super.init(root, options);
    this.#init(options);
  }

  #init(options = {}) {
    const rootElement = this.rootElement;
    const datasetValueField = rootElement?.dataset.valueField;
    const datasetTextField = rootElement?.dataset.textField;
    const datasetTooltipField = rootElement?.dataset.tooltipField;

    // Initialize value field
    const valueField = options.valueField ?? datasetValueField ?? null;
    if (valueField != null) {
      assertNonBlankString(valueField, "valueField");
      if (this.#items.length > 0) {
        assertKeyExists(valueField, this.#items[0], "valueField");
      }
      this.#valueField = valueField;
    }

    // Initialize text field
    const textField = options.textField ?? datasetTextField ?? null;
    if (textField != null) {
      assertNonBlankString(textField, "textField");
      this.#textField = textField;
    }

    // Initialize tooltip field
    const tooltipField = options.tooltipField ?? datasetTooltipField ?? null;
    if (tooltipField != null) {
      assertNonBlankString(tooltipField, "tooltipField");
      this.#tooltipField = tooltipField;
    }
  }
  // -----------------------------------------------------------------------------
  // fields
  // -----------------------------------------------------------------------------

  get textField() {
    return this.#textField;
  }

  get valueField() {
    return this.#valueField;
  }

  get tooltipField() {
    return this.#tooltipField;
  }

  // -----------------------------------------------------------------------------
  // items
  // -----------------------------------------------------------------------------

  // Internal items for this class and subclasses. Do not mutate directly.
  get items() {
    return this.#items;
  }

  getItems() {
    return this.#items.map((item) => ({ ...item }));
  }

  setItems(items) {
    if (isNullishOrEmpty(items)) {
      this.#items = [];
    } else {
      assertPlainObjectArray(items, "items", this.#valueField);
      assertNoDuplicatePlainObjectValues(items, this.#valueField, "items");
      for (const item of items) {
        const value = item[this.#valueField];
        assertNonBlankString(value, `the value of field "${this.#valueField}"`);
        assertValueNotExists(value, RESERVED_KEYS, "reserved key");
      }

      this.#items = items.map((item) => ({ ...item }));
    }

    this.onItemsChange(this.#items);
    this.#render(this.#items);
    this.afterSetItems(this.#items);
  }

  onItemsChange(items) {
    // Override this method to perform actions after items have changed.
  }

  afterSetItems(items) {
    // Override this method to perform actions after setting items.
  }

  addItem(item) {
    assertPlainObjectOrNonEmptyArray(item, "item", this.#valueField);

    const [normalizedItems] = this.normalizeArray(item);
    for (const tmpItem of normalizedItems) {
      const value = tmpItem[this.#valueField];
      assertNonBlankString(value, `the value of field "${this.#valueField}"`);
      assertValueNotExists(
        value,
        this.itemValues,
        `the value of field "${this.#valueField}"`,
      );
      assertValueNotExists(value, RESERVED_KEYS, "reserved key");
    }

    assertNoDuplicatePlainObjectValues(
      normalizedItems,
      this.#valueField,
      "item",
    );

    for (const tmpItem of normalizedItems) {
      this.#items.push({ ...tmpItem });
    }

    this.onItemsChange(this.#items);
    this.#render(this.#items);
    this.afterAddItem(item);
  }

  afterAddItem(item) {
    // Override this method to perform actions after adding items.
  }

  updateItem(item) {
    assertPlainObjectOrNonEmptyArray(item, "item", this.#valueField);

    const [normalizedItems] = this.normalizeArray(item);
    for (const tmpItem of normalizedItems) {
      const value = tmpItem[this.#valueField];
      assertValueExists(
        value,
        this.itemValues,
        `the value of field "${this.#valueField}"`,
      );
    }

    assertNoDuplicatePlainObjectValues(
      normalizedItems,
      this.#valueField,
      "item",
    );

    for (const tmpItem of normalizedItems) {
      const index = this.#items.findIndex(
        (find_item) =>
          find_item[this.#valueField] === tmpItem[this.#valueField],
      );

      this.#items[index] = { ...tmpItem };
    }

    this.onItemsChange(this.#items);
    this.#render(this.#items);
    this.afterUpdateItem(item);
  }

  afterUpdateItem(item) {
    // Override this method to perform actions after updating items.
  }

  removeItem(value) {
    assertNonBlankStringOrNonEmptyArray(value, "value");

    const [normalizedValues] = this.normalizeArray(value);
    for (const tmpValue of normalizedValues) {
      assertValueExists(
        tmpValue,
        this.itemValues,
        `the value of field "${this.#valueField}"`,
      );
    }

    this.#items = this.#items.filter(
      (item) => !normalizedValues.includes(item[this.#valueField]),
    );

    this.onItemsChange(this.#items);
    this.#render(this.#items);
    this.afterRemoveItem(value);
  }

  afterRemoveItem(value) {
    // Override this method to perform actions after removing items.
  }

  getItem(value) {
    if (isNullishOrEmpty(value)) {
      return null;
    }

    assertNonBlankStringOrNonEmptyArray(value, "value");

    const [normalizedValues, isArray] = this.normalizeArray(value);
    for (const tmpValue of normalizedValues) {
      assertValueExists(
        tmpValue,
        this.itemValues,
        `the value of field "${this.#valueField}"`,
      );
    }

    const items = this.#items.filter((item) =>
      normalizedValues.includes(item[this.#valueField]),
    );

    return isArray ? items.map((item) => ({ ...item })) : { ...items[0] };
  }

  eachItem(callback) {
    assertFunction(callback, "callback");

    this.#items.forEach((item, index) => {
      const value = item[this.#valueField];
      const element = this.dom?.get(value) ?? null;
      callback({ item, index, value, element });
    });
  }

  // -----------------------------------------------------------------------------
  // value
  // -----------------------------------------------------------------------------

  get itemValues() {
    return this.#items.map((item) => item[this.#valueField]);
  }

  filterExistingValue(value) {
    if (isNullishOrEmpty(value) || isNullishOrEmpty(this.#items)) {
      return null;
    }

    const [normalizedValues, isArray] = this.normalizeArray(value);
    const itemValues = this.itemValues;

    const filteredValues = normalizedValues.filter((v) =>
      itemValues.includes(v),
    );

    if (filteredValues.length === 0) {
      return null;
    }

    return isArray ? filteredValues : filteredValues[0];
  }

  validateValueExists(value) {
    if (isNullishOrEmpty(value)) {
      return;
    }

    const [normalizedValues] = this.normalizeArray(value);
    for (const tmpValue of normalizedValues) {
      assertValueExists(tmpValue, this.itemValues, "value");
    }
  }

  validateValueByMode(value, valueMode = 1) {
    if (![1, 2].includes(valueMode)) {
      throw new Error(`invalid valueMode: ${valueMode}`);
    }

    if (isNullishOrEmpty(value)) {
      return;
    }

    if (valueMode === 1) {
      assertNonBlankString(value, "value");
    } else if (valueMode === 2) {
      assertNonEmptyNonBlankStringArray(value, "value");
      assertNoDuplicateValues(value, "value");
    }
  }

  isEqualValue(value1, value2) {
    if (value1 == null || value2 == null) {
      return value1 == null && value2 == null;
    }

    if (typeof value1 === "string" && typeof value2 === "string") {
      return value1 === value2;
    }

    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) {
        return false;
      }

      const sortedValues1 = [...value1].sort();
      const sortedValues2 = [...value2].sort();

      return sortedValues1.every(
        (value, index) => value === sortedValues2[index],
      );
    }

    return false;
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

  renderItems() {
    this.#render(this.#items);
  }

  #render(items) {
    if (this.dom == null) {
      return;
    }
    this.dom.clear();

    this.beforeRender(items);

    if (items.length === 0) {
      const emptyElement = this.createEmptyElement();
      this.dom.add("__empty__", emptyElement);
      this.afterRender(items);
      return;
    }

    this.#renderHeader();

    for (const item of items) {
      this.#renderItem(item);
    }

    this.#renderFooter();

    this.afterRender(items);
  }

  #renderHeader() {
    const headerElement = this.createHeaderElement();
    if (headerElement != null) {
      assertHtmlElement(headerElement, "headerElement");
      this.dom.add("__header__", headerElement);
    }
  }

  #renderItem(item) {
    this.beforeRenderItem(item);
    const itemElement = this.createItemElement(item);
    assertHtmlElement(itemElement, "itemElement");
    this.dom.add(item[this.#valueField], itemElement);
    this.afterRenderItem(item);
  }

  #renderFooter() {
    const footerElement = this.createFooterElement();
    if (footerElement != null) {
      assertHtmlElement(footerElement, "footerElement");
      this.dom.add("__footer__", footerElement);
    }
  }

  createEmptyElement() {
    const name = this.rootElement.dataset.name ?? "";
    const defaultEmptyHTML = `<div style="display: flex; align-items: center; justify-content: center; min-height: 36px;">No ${name} items</div>`;
    const template = document.createElement("template");
    template.innerHTML = defaultEmptyHTML.trim();
    return template.content.firstChild;
  }

  createHeaderElement() {
    // Override this method to create a header element. Return null if no header is needed.
    return null;
  }

  createItemElement(item) {
    // must override this method to create an item element.
    throw new Error("createItemElement must be implemented");
  }

  createFooterElement() {
    // Override this method to create a footer element. Return null if no footer is needed.
    return null;
  }

  beforeRender(items) {
    // Override this method to perform actions before rendering items.
  }

  beforeRenderItem(item) {
    // Override this method to perform actions before rendering an item.
  }

  afterRenderItem(item) {
    // Override this method to perform actions after rendering an item.
  }

  afterRender(items) {
    // Override this method to perform actions after rendering items.
  }
}
