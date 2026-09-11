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
} from "./assert.js";

const EMPTY_KEY = "__empty__";
const EMPTY_TEMPLATE = `
<div style="display: flex; align-items: center; justify-content: center; min-height: 36px;">No items</div>
`;

export class ItemsElm extends Elm {
  #valueField = "value";
  #textField = "text";
  #items = [];

  constructor(root, options = {}) {
    super(root, options);

    this.resolveOption("valueField", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#valueField = value;
    });

    this.resolveOption("textField", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#textField = value;
    });
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

  // -----------------------------------------------------------------------------
  // empty element
  // -----------------------------------------------------------------------------

  #updateEmptyElement() {
    const show = this.#items.length === 0;
    const exists = this.dom.has(EMPTY_KEY);

    if (show === exists) {
      return;
    }

    if (show) {
      this.dom.add(EMPTY_KEY, this.createEmptyElement());
    } else {
      this.dom.remove(EMPTY_KEY);
    }
  }

  // Override this method to customize the empty state element.
  createEmptyElement() {
    return this.resolveElement(EMPTY_TEMPLATE);
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
    // check
    if (!isNullishOrEmpty(items)) {
      assertPlainObjectArray(items, "items", this.#valueField);
      assertNoDuplicatePlainObjectValues(items, this.#valueField, "items");

      for (const item of items) {
        assertNonBlankString(
          item[this.#valueField],
          `the value of field "${this.#valueField}"`,
        );
      }
    }

    // set items
    const newItems = this.#setItems(items);

    // render items
    this.#setItemsRender(newItems);
  }

  #setItems(items) {
    let newItems;

    if (isNullishOrEmpty(items)) {
      newItems = [];
    } else {
      newItems = items.map((item) => ({ ...item }));
    }
    this.#items = newItems;
    this.afterSetItems(newItems);

    return newItems;
  }

  #setItemsRender(items) {
    this.dom.clear();
    this.beforeRenderItems(items);

    this.#updateEmptyElement();

    for (const item of items) {
      this.renderItem(item);
    }
    this.afterRenderItems(items);
    
    this.#updateEmptyElement();
  }

  afterSetItems(items) {
    // Override this method to perform actions after setting items.
  }

  beforeRenderItems(items) {
    // Override this method to perform actions before rendering items.
  }

  renderItem(item) {
    throw new Error("renderItem must be implemented by the subclass.");
  }

  afterRenderItems(items) {
    // Override this method to perform actions after rendering items.
  }

  // -----------------------------------------------------------------------------
  // add item
  // -----------------------------------------------------------------------------

  addItem(item) {
    // check
    assertPlainObject(item, "item", this.#valueField);

    const assertionSubject = `item."${this.#valueField}"`;
    const value = item[this.#valueField];

    assertNonBlankString(value, assertionSubject);
    assertValueNotExists(value, this.itemValues, assertionSubject);

    // add item
    const addedItem = this.#addItem(item);

    // render the added item
    this.#addItemRender(addedItem);

    return { ...addedItem };
  }

  // Add a single item to the internal list.
  #addItem(item) {
    const addedItem = { ...item };
    this.#items.push(addedItem);
    this.afterAddItem(addedItem);

    return addedItem;
  }

  // Render a single added item.
  #addItemRender(addedItem) {
    this.#updateEmptyElement();
    this.renderItem(addedItem);
    this.#updateEmptyElement();
  }

  afterAddItem(addedItem) {
    // Override this method to perform actions after adding an item.
  }

  // -----------------------------------------------------------------------------
  // update item
  // -----------------------------------------------------------------------------

  updateItem(item) {
    // check
    assertPlainObject(item, "item", this.#valueField);

    const assertionSubject = `item."${this.#valueField}"`;
    const value = item[this.#valueField];

    assertNonBlankString(value, assertionSubject);
    assertValueExists(value, this.itemValues, assertionSubject);

    // update item
    const updatedItem = this.#updateItem(item);

    // render the updated item
    this.#updateItemRender(updatedItem);

    return { ...updatedItem };
  }

  // Update the item in the internal list.
  #updateItem(item) {
    const updatedItem = { ...item };
    const index = this.#items.findIndex(
      (findItem) => findItem[this.#valueField] === item[this.#valueField],
    );

    this.#items[index] = updatedItem;
    this.afterUpdateItem(updatedItem);

    return updatedItem;
  }

  // render the updated item
  #updateItemRender(updatedItem) {
    this.renderUpdatedItem(updatedItem);
    this.#updateEmptyElement();
  }

  afterUpdateItem(updatedItem) {
    // Override this method to perform actions after updating an item.
  }

  // render updated item
  renderUpdatedItem(updatedItem) {
    throw new Error(
      "renderUpdatedItem method must be implemented by subclass.",
    );
  }

  // -----------------------------------------------------------------------------
  // remove item
  // -----------------------------------------------------------------------------

  removeItem(value) {
    const assertionSubject = this.#valueField;
    assertNonBlankString(value, assertionSubject);
    assertValueExists(value, this.itemValues, assertionSubject);

    // remove item
    const removedItem = this.#removeItem(value);

    // render the removed item
    this.#removeItemRender(removedItem);

    return { ...removedItem };
  }

  // Remove the item from the internal list by its value.
  #removeItem(value) {
    let removedItem = null;
    this.#items = this.#items.filter((item) => {
      if (item[this.#valueField] === value) {
        removedItem = item;
        return false;
      }
      return true;
    });
    this.afterRemoveItem(removedItem);

    return removedItem;
  }

  #removeItemRender(removedItem) {
    this.#updateEmptyElement();
    this.renderRemovedItem(removedItem);
    this.#updateEmptyElement();
  }

  afterRemoveItem(removedItem) {
    // Override this method to perform actions after removing an item.
  }

  // Override this method to perform actions after rendering the removed item.
  renderRemovedItem(removedItem) {
    const value = removedItem[this.#valueField];
    this.dom.remove(value);
  }

  // -----------------------------------------------------------------------------
  // get item
  // -----------------------------------------------------------------------------

  getItem(value) {
    if (isNullishOrEmpty(value)) {
      return null;
    }

    const assertionSubject = this.#valueField;

    assertNonBlankString(value, assertionSubject);
    assertValueExists(value, this.itemValues, assertionSubject);

    const item = this.#items.find((item) => item[this.#valueField] === value);

    return { ...item };
  }

  eachItem(callback) {
    assertFunction(callback, "callback");

    this.#items.forEach((item, index) => {
      const value = item[this.#valueField];
      const element = this.dom.get(value);
      callback({
        item: { ...item },
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

  filterItemValue(value) {
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

  assertItemValueExists(value) {
    if (isNullishOrEmpty(value)) {
      return;
    }

    const [normalizedValues] = this.normalizeArray(value);
    for (const tmpValue of normalizedValues) {
      assertValueExists(tmpValue, this.itemValues, "value");
    }
  }
}
