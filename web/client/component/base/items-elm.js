import {
  createElementByHTML,
  validateValue,
  validateValueExists,
  isPlainObject,
} from "./elm-helper.js";
import { Elm } from "./elm.js";

export class ItemsElm extends Elm {
  #textField = "text";
  #valueField = "value";
  #tooltipField = "tooltip";
  #items = [];

  constructor(root, options = {}) {
    super(root, options);
    this.init(root, options);
  }

  init(root, options = {}) {
    super.init(root, options);

    const textField = options.textField
      ? options.textField
      : this.rootElement.dataset["text-field"]
        ? this.rootElement.dataset["text-field"]
        : null;
    if (textField != null) {
      assertNonBlankString(textField, "textField");
      this.#textField = textField;
    }

    const valueField = options.valueField
      ? options.valueField
      : this.rootElement.dataset["value-field"]
        ? this.rootElement.dataset["value-field"]
        : null;
    if (valueField != null) {
      assertNonBlankString(valueField, "valueField");
      this.#valueField = valueField;
    }

    const tooltipField = options.tooltipField
      ? options.tooltipField
      : this.rootElement.dataset["tooltip-field"]
        ? this.rootElement.dataset["tooltip-field"]
        : null;
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
    if (isNullOrEmpty(items)) {
      this.#items = [];
    } else {
      assertItems(items, this.#textField, this.#valueField);
      this.#items = items.map((item) => ({ ...item }));
    }

    this.#render(this.#items);
  }

  addItem(item) {
    if (!isPlainObject(item) && !Array.isArray(item)) {
      throw new Error("item must be a plain object or an array");
    }

    const isArray = Array.isArray(item);
    const items = isArray ? [...item] : [item];

    for (const o of items) {
      assertItem(o, this.#textField, this.#valueField);
      const value = o[this.#valueField];
      if (this.#items.some((item) => item[this.#valueField] === value)) {
        throw new Error(`item with value '${value}' already exists`);
      }

      this.#items.push({ ...o });

      this.#renderItem(this.#items[this.#items.length - 1]);
    }
  }

  updateItem(item) {
    if (!isPlainObject(item) && !Array.isArray(item)) {
      throw new Error("item must be a plain object or an array");
    }

    const isArray = Array.isArray(item);
    const items = isArray ? [...item] : [item];

    for (const o of items) {
      assertItem(o, this.#textField, this.#valueField);

      const value = o[this.#valueField];
      if (!this.#items.some((item) => item[this.#valueField] === value)) {
        throw new Error(`item with value '${value}' does not exist`);
      }

      const index = this.#items.findIndex(
        (item) => item[this.#valueField] === value,
      );

      this.#items[index] = { ...o };

      const newItemElement = this.createItemElement(o);
      this.dom.replace(value, newItemElement);
    }
  }

  removeItem(value) {
    if (!isNonBlankString(value) && !Array.isArray(value)) {
      throw new Error("value must be a non-blank string or an array");
    }

    const isArray = Array.isArray(value);
    const values = isArray ? [...value] : [value];

    this.#items = this.#items.filter(
      (item) => !values.includes(item[this.#valueField]),
    );

    for (const val of values) {
      this.dom.remove(val);
    }
  }

  getItem(value) {
    if (!isNonBlankString(value) && !Array.isArray(value)) {
      throw new Error("value must be a non-blank string or an array");
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
  // render
  // -----------------------------------------------------------------------------

  #render(items) {
    this.beforeRender(items);
    this.root.clear();

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
// Private helper
// ----------------------------------------------

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
    throw new Error("items item must be a plain object");
  }

  assertItemFields(item, textField, valueField);
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

function assertHtmlElement(element, fieldName = "element") {
  if (!(element instanceof HTMLElement)) {
    throw new Error(`${fieldName} must be an HTMLElement`);
  }
}

function assertNonBlankString(value, fieldName = "value") {
  if (!isNonBlankString(value)) {
    throw new Error(`${fieldName} must be a non-blank string`);
  }
}

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
