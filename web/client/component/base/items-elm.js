import { Elm } from "./elm.js";

const RESERVED_KEYS = ["__root__", "__empty__", "__header__", "__footer__"];

export class ItemsElm extends Elm {
  #textField = "text";
  #valueField = "value";
  #tooltipField = "tooltip";
  #items = [];

  constructor(root, options = {}) {
    super(root, options);
    this.#init(root, options);
  }

  init(root, options = {}) {
    super.init(root, options);
    this.#init(root, options);
  }

  #init(root, options = {}) {
    const rootElement = this.rootElement;
    const datasetTextField = rootElement?.dataset.textField;
    const datasetValueField = rootElement?.dataset.valueField;
    const datasetTooltipField = rootElement?.dataset.tooltipField;

    const textField = options.textField ?? datasetTextField ?? null;
    if (textField != null) {
      assertNonBlankString(textField, "textField");
      this.#textField = textField;
    }

    const valueField = options.valueField ?? datasetValueField ?? null;
    if (valueField != null) {
      assertNonBlankString(valueField, "valueField");
      this.#valueField = valueField;
    }

    const tooltipField = options.tooltipField ?? datasetTooltipField ?? null;
    if (tooltipField != null) {
      assertNonBlankString(tooltipField, "tooltipField");
      this.#tooltipField = tooltipField;
    }

    this.#render(this.#items);
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
    if (isNullOrEmpty(items)) {
      this.#items = [];
    } else {
      assertItems(items, this.#textField, this.#valueField);
      this.#items = items.map((item) => ({ ...item }));
    }

    this.#render(this.#items);
  }

  addItem(item) {
    assertItemOrArray(item, this.#textField, this.#valueField);
    assertItemNotExists(item, this.#items, this.#valueField);

    const [items] = normalizeArray(item);
    items.forEach((tmp) => {
      this.#items.push({ ...tmp });
    });

    this.#render(this.#items);
    this.afterAddItem(item);
  }

  afterAddItem(targetItem) {
    // Override this method to perform actions after adding items.
  }

  updateItem(item) {
    assertItemOrArray(item, this.#textField, this.#valueField);
    assertItemExists(item, this.#items, this.#valueField);

    const [items] = normalizeArray(item);
    items.forEach((tmp) => {
      const index = getItemIndex(
        tmp[this.#valueField],
        this.#items,
        this.#valueField,
      );

      this.#items[index] = { ...tmp };
    });

    this.#render(this.#items);
    this.afterUpdateItem(item);
  }

  afterUpdateItem(targetItem) {
    // Override this method to perform actions after updating items.
  }

  removeItem(value) {
    assertNonBlankStringOrArray(value, "value");
    assertValueExists(value, this.#items, this.#valueField, "value");

    const [values] = normalizeArray(value);

    this.#items = this.#items.filter(
      (item) => !values.includes(item[this.#valueField]),
    );

    this.#render(this.#items);
    this.afterRemoveItem(value);
  }

  afterRemoveItem(value) {
    // Override this method to perform actions after removing items.
  }

  getItem(value) {
    assertNonBlankStringOrArray(value, "value");
    assertValueExists(value, this.#items, this.#valueField, "value");

    const [values, isArray] = normalizeArray(value);

    const items = this.#items.filter((item) =>
      values.includes(item[this.#valueField]),
    );

    return isArray ? items.map((item) => ({ ...item })) : { ...items[0] };
  }

  // -----------------------------------------------------------------------------
  // render
  // -----------------------------------------------------------------------------

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

// ----------------------------------------------
// Private assert functions
// ----------------------------------------------

/** assert item */

function assertItems(items, textField, valueField) {
  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }

  for (const item of items) {
    assertItem(item, textField, valueField);
  }

  const values = new Set(items.map((item) => item[valueField]));
  if (values.size !== items.length) {
    throw new Error("items must not contain duplicate values");
  }
}

function assertItem(item, textField, valueField) {
  if (!isPlainObject(item)) {
    throw new Error("item must be a plain object");
  }

  assertItemFields(item, textField, valueField);

  if (RESERVED_KEYS.includes(item[valueField])) {
    throw new Error(
      `item value '${item[valueField]}' is reserved and cannot be used`,
    );
  }
}

function assertItemFields(item, ...fields) {
  for (const field of fields) {
    if (!Object.hasOwn(item, field)) {
      throw new Error(`item is missing the ${field} field`);
    }

    if (!isNonBlankString(item[field])) {
      throw new Error(`item.${field} must be a non-blank string`);
    }
  }
}

function assertItemOrArray(item, textField, valueField) {
  const [item_items, isArray] = normalizeArray(item);

  if (isArray && item_items.length === 0) {
    throw new Error(
      "item must be a valid item or a non-empty array of valid items",
    );
  }

  for (const o of item_items) {
    assertItem(o, textField, valueField);
  }

  if (isArray) {
    const values = new Set(item_items.map((item) => item[valueField]));
    if (values.size !== item_items.length) {
      throw new Error("item array must not contain duplicate values");
    }
  }
}

function assertItemExists(item, items, valueField) {
  const values = items.map((i) => i[valueField]);
  const [item_items] = normalizeArray(item);

  const missingItem = item_items.find(
    (tmp) => !values.includes(tmp[valueField]),
  );
  if (missingItem) {
    throw new Error(
      `item with value '${missingItem[valueField]}' does not exist in items`,
    );
  }
}

function assertItemNotExists(item, items, valueField) {
  const values = items.map((i) => i[valueField]);
  const [item_items] = normalizeArray(item);

  const existingItem = item_items.find((tmp) =>
    values.includes(tmp[valueField]),
  );
  if (existingItem) {
    throw new Error(
      `item with value '${existingItem[valueField]}' already exists in items`,
    );
  }
}

/** assert value */

function assertValueExists(value, items, valueField, fieldName = "value") {
  const values = items.map((i) => i[valueField]);
  const [value_values] = normalizeArray(value);

  const missingValue = value_values.find((v) => !values.includes(v));
  if (missingValue) {
    throw new Error(`${fieldName} '${missingValue}' does not exist in items`);
  }
}

/** assert dom */

function assertHtmlElement(element, fieldName = "element") {
  if (!(element instanceof HTMLElement)) {
    throw new Error(`${fieldName} must be an HTMLElement`);
  }
}

/** assert base */

function assertNonBlankString(value, fieldName = "value") {
  if (!isNonBlankString(value)) {
    throw new Error(`${fieldName} must be a non-blank string`);
  }
}

function assertNonBlankStringOrArray(value, fieldName = "value") {
  const [values, isArray] = normalizeArray(value);

  if (isArray && values.length === 0) {
    throw new Error(
      `${fieldName} must be a non-blank string or a non-empty array of non-blank strings`,
    );
  }

  for (const v of values) {
    assertNonBlankString(v, fieldName);
  }
}

// ----------------------------------------------
// Private helper functions
// ----------------------------------------------

function isNonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}

function isNullOrEmpty(value) {
  if (
    value == null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return true;
  }
  return false;
}

function normalizeArray(value) {
  return Array.isArray(value) ? [value, true] : [[value], false];
}

function getItemIndex(value, items, valueField) {
  return items.findIndex((item) => item[valueField] === value);
}
