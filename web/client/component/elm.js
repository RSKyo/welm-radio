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
  #rootElement;
  #childMap = new Map();

  constructor(element) {
    this.#assertElement(element);
    this.#rootElement = element;
  }

  get element() {
    return this.#rootElement;
  }

  get size() {
    return this.#childMap.size;
  }

  clear() {
    while (this.size > 0) {
      const keys = this.keys();

      this.remove(keys.at(-1));
    }
  }

  add(key, element, parentKey = null) {
    this.#assertNotExistingKey(key);
    this.#assertElement(element);

    if (parentKey != null) {
      this.#assertExistingKey(parentKey);

      const parent = this.#childMap.get(parentKey);
      parent.element.appendChild(element);

      // Update the parent's childKeys to include the new child.
      parent.childKeys.push(key);
      this.#childMap.set(parentKey, parent);
    } else {
      this.#rootElement.appendChild(element);
    }

    // add the new element to the child map
    this.#childMap.set(key, {
      element,
      parentKey,
      childKeys: [],
    });
  }

  get(key) {
    // Returns undefined if the key does not exist.
    return this.#childMap.get(key)?.element;
  }

  remove(key) {
    this.#assertExistingKey(key);

    for (const childKey of this.childKeys(key)) {
      this.remove(childKey);
    }

    const { parentKey } = this.#childMap.get(key);
    if (parentKey != null) {
      const parent = this.#childMap.get(parentKey);
      parent.childKeys = parent.childKeys.filter((k) => k !== key);
      this.#childMap.set(parentKey, parent);
    }

    const { element } = this.#childMap.get(key);

    element.remove();
    this.#childMap.delete(key);
  }

  replace(key, element) {
    this.#assertExistingKey(key);
    this.#assertElement(element);

    const current = this.#childMap.get(key);
    current.element.replaceWith(element);

    if (current.childKeys.length > 0) {
      for (const childKey of current.childKeys) {
        const child = this.#childMap.get(childKey);
        element.appendChild(child.element);
      }
    }

    this.#childMap.set(key, {
      ...current,
      element,
    });
  }

  keys() {
    return [...this.#childMap.keys()];
  }

  childKeys(key) {
    this.#assertExistingKey(key);

    return [...this.#childMap.get(key).childKeys];
  }

  elements() {
    return Array.from(this.#childMap.values(), (item) => item.element);
  }

  children(key) {
    this.#assertExistingKey(key);

    return this.childKeys(key).map((childKey) => this.get(childKey));
  }

  has(key) {
    this.#assertKey(key);

    return this.#childMap.has(key);
  }

  each(callback) {
    if (typeof callback !== "function") {
      throw new Error("callback must be a function");
    }

    for (const [key, item] of this.#childMap.entries()) {
      callback(key, item.element, item.parentKey);
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

  #assertNotExistingKey(key) {
    this.#assertKey(key);

    if (this.#childMap.has(key)) {
      throw new Error(`element already exists: ${key}`);
    }
  }

  #assertElement(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error("element must be an HTMLElement");
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

  addItem(newItem) {
    if (newItem == null) {
      throw new Error("newItem must be provided");
    }

    validateItemFields(newItem, this.#textField, this.#valueField);

    const value = newItem[this.#valueField];
    if (this.#items.some((item) => item[this.#valueField] === value)) {
      throw new Error(`item with value '${value}' already exists`);
    }

    this.#items.push({ ...newItem });

    const newItemElement = this.createItemElement(newItem);
    this.root.add(value, newItemElement);

    this.afterAddItem(newItem);
  }

  afterAddItem(newItem) {
    // Override this method to perform actions after adding an item.
  }

  updateItem(newItem) {
    if (newItem == null) {
      throw new Error("newItem must be provided");
    }

    validateItemFields(newItem, this.#textField, this.#valueField);

    const value = newItem[this.#valueField];
    if (!this.#items.some((item) => item[this.#valueField] === value)) {
      throw new Error(`item with value '${value}' does not exist`);
    }

    validateValue(value);
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

    if(!isNonBlankString(value)) {
      throw new Error("value must be a non-blank string");
    }
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
