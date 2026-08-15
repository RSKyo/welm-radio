import {
  createElementByHTML,
  detectFields,
  validateItems,
  validateItemFields,
  validateValue,
  validateValueExists,
  isNonBlankString,
  isNullOrEmpty,
  isPlainObject,
} from "./elm-helper.js";

// Elements are stored by reference.
// The element in the Map and the element in the DOM are the same object.
export class ElmRoot {
  #element;
  #childMap = new Map();

  constructor(element) {
    this.#assertElement(element);
    this.#element = element;
  }

  get element() {
    return this.#element;
  }

  clear() {
    for (const element of this.#childMap.values()) {
      // Remove the element from the DOM.
      element.remove();
    }

    this.#childMap.clear();
  }

  add(key, element) {
    this.#assertKey(key);
    this.#assertElement(element);

    if (this.#childMap.has(key)) {
      throw new Error(`element already exists: ${key}`);
    }

    this.#element.appendChild(element);
    this.#childMap.set(key, element);
  }

  get(key) {
    // Returns undefined if the key does not exist.
    return this.#childMap.get(key);
  }

  remove(key) {
    this.#assertExistingKey(key);
    const element = this.#childMap.get(key);

    element.remove();
    this.#childMap.delete(key);

    return element;
  }

  replace(key, element) {
    this.#assertElement(element);
    this.#assertExistingKey(key);

    const oldElement = this.#childMap.get(key);

    oldElement.replaceWith(element);
    this.#childMap.set(key, element);

    return oldElement;
  }

  keys() {
    return [...this.#childMap.keys()];
  }

  elements() {
    return [...this.#childMap.values()];
  }

  has(key) {
    this.#assertKey(key);

    return this.#childMap.has(key);
  }

  get size() {
    return this.#childMap.size;
  }

  each(callback) {
    if (typeof callback !== "function") {
      throw new Error("callback must be a function");
    }

    for (const [key, element] of this.#childMap.entries()) {
      callback(key, element);
    }
  }

  #assertKey(key) {
    if (typeof key !== "string" || key.trim() === "") {
      throw new Error("key must be a non-blank string");
    }
  }

  #assertExistingKey(key) {
    this.#assertKey(key);

    if (!this.#childMap.has(key)) {
      throw new Error(`element not found: ${key}`);
    }
  }

  #assertElement(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error("element must be an HTMLElement");
    }
  }
}

export class Elm {
  #rootElement;
  #root;

  constructor(root, options = {}) {
    const rootClass = options.rootClass;
    this.#rootElement = this.#initRootElement(root, rootClass);
    this.#root = new ElmRoot(this.#rootElement);

    const dataset = options.dataset ?? {};
    this.#initRootElementDataset(dataset);
  }

  get rootElement() {
    return this.#rootElement;
  }

  get root() {
    return this.#root;
  }

  get dataset() {
    return this.#rootElement.dataset;
  }

  #initRootElement(target, className) {
    if (
      className != null &&
      (!isNonBlankString(className) || /\s/.test(className))
    ) {
      throw new Error("className must be a single non-blank CSS class name");
    }

    let element = target;

    if (isNonBlankString(target)) {
      if (target.startsWith("#")) {
        target = target.slice(1);
      }
      element = document.getElementById(target);
    }

    if (!element || !(element instanceof HTMLElement)) {
      throw new Error(`target must be an element id or an HTMLElement but got: ${String(target)}`);
    }

    if (className) {
      element.classList.add(className);
    }

    return element;
  }

  #initRootElementDataset(dataset) {
    if (!isPlainObject(dataset)) {
      throw new Error("dataset must be a plain object");
    }

    for (const [key, value] of Object.entries(dataset)) {
      if (!isNonBlankString(key)) {
        throw new Error("dataset keys must be non-blank strings");
      }

      if (!isNonBlankString(value)) {
        throw new Error("dataset values must be non-blank strings");
      }

      this.#rootElement.dataset[key] = value;
    }
  }
}

export class ItemsElm extends Elm {
  #textField;
  #valueField;
  #tooltipField;
  #items = [];

  constructor(root, options = {}) {
    super(root, options);

    if (options.textField != null) {
      this.#setTextField(options.textField);
    }

    if (options.valueField != null) {
      this.#setValueField(options.valueField);
    }

    if (options.tooltipField != null) {
      this.#setTooltipField(options.tooltipField);
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

  #setTextField(field) {
    if (!isNonBlankString(field)) {
      throw new Error("textField must be a non-blank string");
    }

    this.#textField = field;
  }

  #setValueField(field) {
    if (!isNonBlankString(field)) {
      throw new Error("valueField must be a non-blank string");
    }

    this.#valueField = field;
  }

  #setTooltipField(field) {
    if (!isNonBlankString(field)) {
      throw new Error("tooltipField must be a non-blank string");
    }

    this.#tooltipField = field;
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
    validateItems(items);

    if (isNullOrEmpty(items)) {
      this.#items = [];
    } else {
      const detectedFields = detectFields(items);
      this.#textField ??= detectedFields.textField;
      this.#valueField ??= detectedFields.valueField;
      this.#tooltipField ??= detectedFields.tooltipField;

      validateItemFields(items, this.#textField, this.#valueField);
      this.#items = items.map((item) => ({ ...item }));
    }

    this.#render(this.#items);
  }

  updateItem(newItem) {
    if (newItem == null) {
      throw new Error("newItem must be provided");
    }

    validateItemFields(newItem, this.#textField, this.#valueField);

    const value = newItem[this.#valueField];
    validateValueExists(value, this.#items, this.#valueField);

    const index = this.#items.findIndex(
      (item) => item[this.#valueField] === value,
    );

    this.#items[index] = { ...newItem };

    const newItemElement = this.createItemElement(newItem);
    this.root.replace(value, newItemElement);

    this.afterUpdateItem(newItem);
  }

  afterUpdateItem(newItem) {
    // Override this method to perform actions after updating an item.
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
  // render
  // -----------------------------------------------------------------------------
  #render(items) {
    this.beforeRender(items);
    this.root.clear();

    if (items.length === 0) {
      const emptyElement = this.createEmptyElement();
      this.root.add("__empty__", emptyElement);
      this.afterRender(items);
      return;
    }

    const headerElement = this.createHeaderElement();
    if (headerElement) {
      if (!(headerElement instanceof HTMLElement)) {
        throw new Error("createHeaderElement must return an HTMLElement");
      }

      this.root.add("__header__", headerElement);
    }

    for (const item of items) {
      const itemElement = this.createItemElement(item);
      if (!(itemElement instanceof HTMLElement)) {
        throw new Error("createItemElement must return an HTMLElement");
      }

      this.root.add(item[this.#valueField], itemElement);
    }

    const footerElement = this.createFooterElement();
    if (footerElement) {
      if (!(footerElement instanceof HTMLElement)) {
        throw new Error("createFooterElement must return an HTMLElement");
      }

      this.root.add("__footer__", footerElement);
    }

    this.afterRender(items);
  }

  beforeRender(items) {
    // Override this method to perform actions before rendering items.
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
    throw new Error("createItemElement must be implemented");
  }

  createFooterElement() {
    // Override this method to create a footer element. Return null if no footer is needed.
    return null;
  }

  afterRender(items) {
    // Override this method to perform actions after rendering items.
  }
}
