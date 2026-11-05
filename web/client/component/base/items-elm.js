import { Elm } from "./elm.js";
import {
  isNullishOrEmpty,
  assertNonBlankString,
  assertPlainObject,
  assertPlainObjectArray,
  assertNoDuplicatePlainObjectValues,
  assertValueExists,
  assertValueNotExists,
  assertFunction,
  assertNonEmptyNonBlankStringArray,
  assertValueForMode,
} from "./assert.js";
import {
  createElementByHTML,
  normalizeValue,
  clonePlainObject,
} from "./helper.js";

const EMPTY_TEMPLATE = `
<div style="display: flex; align-items: center; justify-content: center; min-height: 36px;">No items</div>
`;
const emptyTemplate = createElementByHTML(EMPTY_TEMPLATE);

export class ItemsElm extends Elm {
  #valueField = "value";
  #textField = "text";
  #items = [];
  #elements = new Map();
  #emptyElement = null;

  constructor(root, options = {}) {
    super(root, options);

    this.applyOption("valueField", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#valueField = value;
    });

    this.applyOption("textField", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#textField = value;
    });
  }

  get textField() {
    return this.#textField;
  }

  get valueField() {
    return this.#valueField;
  }

  getItemElement(value) {
    assertValueExists(
      value,
      this.itemValues,
      `Item element for value "${value}"`,
    );
    return this.#elements.get(value);
  }

  // -----------------------------------------------------------------------------
  // empty element
  // -----------------------------------------------------------------------------

  // Override this method to customize the empty state element.
  createEmptyElement() {
    return emptyTemplate.cloneNode(true);
  }

  #updateEmptyUIState() {
    const show = this.#items.length === 0;
    const exists = this.#emptyElement != null;

    if (show === exists) {
      return;
    }

    if (show) {
      this.#emptyElement = this.createEmptyElement();
      this.rootElement.append(this.#emptyElement);
    } else {
      this.#emptyElement.remove();
      this.#emptyElement = null;
    }
  }

  // -----------------------------------------------------------------------------
  // items
  // -----------------------------------------------------------------------------

  get count() {
    return this.#items.length;
  }
  get isEmpty() {
    return this.#items.length === 0;
  }
  get isNotEmpty() {
    return this.#items.length > 0;
  }

  // Internal items for this class and subclasses. Do not mutate directly.
  get items() {
    return this.#items;
  }

  getItems() {
    return this.#items.map((item) => clonePlainObject(item));
  }

  setItems(items, options = {}) {
    options.assertionSubject = options.assertionSubject ?? "items";
    const assertionSubject = options.assertionSubject;

    // check
    if (!isNullishOrEmpty(items)) {
      assertPlainObjectArray(items, assertionSubject, this.#valueField);
      assertNoDuplicatePlainObjectValues(
        items,
        this.#valueField,
        assertionSubject,
      );

      for (const item of items) {
        assertNonBlankString(
          item[this.#valueField],
          `${assertionSubject}."${this.#valueField}"`,
        );
      }
    }

    this.#setItems(items, options);
    this.#setItemsRender(this.#items, options);
  }

  #setItems(items, options = {}) {
    this.#items = isNullishOrEmpty(items)
      ? []
      : items.map((item) => clonePlainObject(item));

    this.afterSetItems(this.#items, options);
  }

  afterSetItems(items, options = {}) {
    // Override this method to perform actions after setting items.
  }

  #setItemsRender(items, options = {}) {
    // clear root element
    this.event.off({ element: this.rootElement, scope: "descendants" });
    this.rootElement.replaceChildren();
    this.#elements.clear();
    this.#emptyElement = null;

    this.beforeRenderItems(items, options);

    for (const item of items) {
      this.renderItem(item, options);
      this.afterRenderItem(item, options);
    }

    this.afterRenderItems(items, options);

    this.#updateEmptyUIState();
  }

  beforeRenderItems(items, options = {}) {
    // Override this method to perform actions before rendering items.
  }

  renderItem(item, options = {}) {
    // add the item element to the DOM
    const element = this.createItemElement(item, options);
    this.rootElement.append(element);

    // store the element in the internal map for later reference
    this.#elements.set(item[this.#valueField], element);
  }

  createItemElement(item, options = {}) {
    throw new Error("createItemElement must be implemented by the subclass.");
  }

  afterRenderItem(item, options = {}) {
    // Override this method to perform actions after rendering an item.
  }

  afterRenderItems(items, options = {}) {
    // Override this method to perform actions after rendering items.
  }

  // -----------------------------------------------------------------------------
  // add item
  // -----------------------------------------------------------------------------

  addItem(item, options = {}) {
    options.assertionSubject = options.assertionSubject ?? "item";
    const assertionSubject = options.assertionSubject;

    assertPlainObject(item, assertionSubject, this.#valueField);

    const value = item[this.#valueField];

    assertNonBlankString(value, `${assertionSubject}.${this.#valueField}`);
    assertValueNotExists(
      value,
      this.itemValues,
      `${assertionSubject}.${this.#valueField}`,
    );

    // add item
    const addedItem = this.#addItem(item, options);

    // render the added item
    this.#addItemRender(addedItem, options);

    return clonePlainObject(addedItem);
  }

  #addItem(item, options = {}) {
    const addedItem = clonePlainObject(item);
    this.#items.push(addedItem);

    this.afterAddItem(addedItem, options);

    return addedItem;
  }

  afterAddItem(addedItem, options = {}) {
    // Override this method to perform actions after adding an item.
  }

  #addItemRender(addedItem, options = {}) {
    this.renderItem(addedItem, options);
    this.afterRenderItem(addedItem, options);
    this.#updateEmptyUIState();
  }

  // -----------------------------------------------------------------------------
  // update item
  // -----------------------------------------------------------------------------

  updateItem(item, options = {}) {
    options.assertionSubject = options.assertionSubject ?? "item";
    const assertionSubject = options.assertionSubject;

    assertPlainObject(item, assertionSubject, this.#valueField);

    const value = item[this.#valueField];

    assertNonBlankString(value, `${assertionSubject}.${this.#valueField}`);
    assertValueExists(
      value,
      this.itemValues,
      `${assertionSubject}.${this.#valueField}`,
    );

    // update item
    const updatedItem = this.#updateItem(item, options);

    // render the updated item
    this.#updateItemRender(updatedItem, options);

    return clonePlainObject(updatedItem);
  }

  // Update the item in the internal list.
  #updateItem(item, options = {}) {
    const updatedItem = clonePlainObject(item);
    const index = this.#items.findIndex(
      (findItem) => findItem[this.#valueField] === item[this.#valueField],
    );

    this.#items[index] = updatedItem;

    this.afterUpdateItem(updatedItem, options);

    return updatedItem;
  }

  afterUpdateItem(updatedItem, options = {}) {
    // Override this method to perform actions after updating an item.
  }

  // render the updated item
  #updateItemRender(updatedItem, options = {}) {
    this.renderUpdatedItem(updatedItem, options);
    this.afterRenderUpdatedItem(updatedItem, options);
    this.#updateEmptyUIState();
  }

  // render updated item
  renderUpdatedItem(updatedItem, options = {}) {
    // replace the old element with the new element in the DOM
    const oldElement = this.#elements.get(updatedItem[this.#valueField]);
    const newElement = this.createItemElement(updatedItem, options);
    this.event.migrate(oldElement, newElement);
    oldElement.replaceWith(newElement);

    // update the internal map with the new element
    this.#elements.set(updatedItem[this.#valueField], newElement);
  }

  afterRenderUpdatedItem(updatedItem, options = {}) {
    // Override this method to perform actions after updating an item.
  }

  // -----------------------------------------------------------------------------
  // remove item
  // -----------------------------------------------------------------------------

  removeItem(value, options = {}) {
    options.assertionSubject = options.assertionSubject ?? "item";
    const assertionSubject = options.assertionSubject;

    assertNonBlankString(value, assertionSubject);
    assertValueExists(value, this.itemValues, assertionSubject);

    // remove item
    const removedItem = this.#removeItem(value, options);

    // render the removed item
    this.#removeItemRender(removedItem, options);

    return clonePlainObject(removedItem);
  }

  // Remove the item from the internal list by its value.
  #removeItem(value, options) {
    let removedItem = null;
    this.#items = this.#items.filter((item) => {
      if (item[this.#valueField] === value) {
        removedItem = item;
        return false;
      }
      return true;
    });

    this.afterRemoveItem(removedItem, options);

    return removedItem;
  }

  afterRemoveItem(removedItem, options = {}) {
    // Override this method to perform actions after removing an item.
  }

  #removeItemRender(removedItem, options = {}) {
    this.renderRemovedItem(removedItem, options);
    this.afterRenderRemovedItem(removedItem, options);
    this.#updateEmptyUIState();
  }

  renderRemovedItem(removedItem, options = {}) {
    const value = removedItem[this.#valueField];

    // remove element from the DOM
    const element = this.#elements.get(value);
    this.event.off({ element, scope: "subtree" });
    element.remove();

    // remove element from internal map
    this.#elements.delete(value);
  }

  afterRenderRemovedItem(removedItem, options = {}) {
    // Override this method to perform actions after rendering a removed item.
  }

  // -----------------------------------------------------------------------------
  // item access
  // -----------------------------------------------------------------------------

  findItemIndexByValue(value) {
    return this.#items.findIndex((item) => item[this.#valueField] === value);
  }

  getItemByIndex(index) {
    // don't assert the index here, just return null if it's out of bounds.
    if (index < 0 || index >= this.#items.length) {
      return null;
    }

    const item = this.#items[index];

    return item == null ? null : clonePlainObject(item);
  }

  getItemByValue(value, mode = 1) {
    assertValueForMode(value, mode);
    const normalizedValue = normalizeValue(value, mode);

    if (normalizedValue == null) {
      return null;
    }

    const assertionSubject = this.#valueField;

    if (mode === 1) {
      assertNonBlankString(normalizedValue, assertionSubject);
      assertValueExists(normalizedValue, this.itemValues, assertionSubject);

      const item = this.#items.find(
        (item) => item[this.#valueField] === normalizedValue,
      );
      return clonePlainObject(item);
    }

    assertNonEmptyNonBlankStringArray(normalizedValue, assertionSubject);

    const items = this.#items.filter((item) =>
      normalizedValue.includes(item[this.#valueField]),
    );
    return items.map((item) => clonePlainObject(item));
  }

  eachItem(callback) {
    assertFunction(callback, "callback");

    this.#items.forEach((item, index) => {
      const value = item[this.#valueField];
      const element = this.#elements.get(value) ?? null;

      callback({
        item: clonePlainObject(item),
        index,
        value,
        element,
        valueField: this.#valueField,
      });
    });
  }

  // -----------------------------------------------------------------------------
  // value
  // -----------------------------------------------------------------------------

  get itemValues() {
    return this.#items.map((item) => item[this.#valueField]);
  }

  getValueByIndex(index) {
    // don't assert the index here, just return null if it's out of bounds.
    if (index < 0 || index >= this.#items.length) {
      return null;
    }

    return this.#items[index][this.#valueField];
  }
}
