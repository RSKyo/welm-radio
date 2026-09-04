import { Elm } from "./elm.js";
import {
  isNullishOrEmpty,
  assertNonBlankString,
  assertPlainObject,
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

const EMPTY_KEY = "__empty__";
const EMPTY_TEMPLATE = `
<div style="display: flex; align-items: center; justify-content: center; min-height: 36px;">No items</div>
`;

export class ItemsElm extends Elm {
  #valueField;
  #textField;
  #tooltipField;
  #items = [];

  constructor(root, options = {}) {
    super(root, options);

    this.#valueField = options.valueField ?? this.dataset.valueField ?? "value";
    this.#textField = options.textField ?? this.dataset.textField ?? "text";
    this.#tooltipField =
      options.tooltipField ?? this.dataset.tooltipField ?? "tooltip";

    assertNonBlankString(this.#valueField, "valueField");
    assertNonBlankString(this.#textField, "textField");
    assertNonBlankString(this.#tooltipField, "tooltipField");
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
    return this.createElementByHTML(EMPTY_TEMPLATE);
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
    this.#updateEmptyElement();
    if (items.length === 0) {
      return;
    }

    for (const item of items) {
      this.renderItem(item);
    }
    this.afterRenderItems(items);
  }

  afterSetItems(items) {
    // Override this method to perform actions after setting items.
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
  }

  afterAddItem(addedItem) {
    // Override this method to perform actions after adding an item.
  }

  // Render a single item. Must be implemented by subclass.
  renderItem(addedItem) {
    throw new Error("renderItem method must be implemented by subclass.");
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
  }

  afterUpdateItem(updatedItem) {
    // Override this method to perform actions after updating an item.
  }

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
    this.#removeItemRender(value);
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

  #removeItemRender(value) {
    this.dom.remove(value);
    this.#updateEmptyElement();
  }

  afterRemoveItem(removedItem) {
    // Override this method to perform actions after removing an item.
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
      const element = this.dom.get(value) ?? null;
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
}
