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
} from "./assert.js";
import { createElementByHTML, normalizeArray } from "./elm-helper.js";
import { ElmValueState } from "./elm-state.js";

const EMPTY_KEY = "__empty__";
const EMPTY_TEMPLATE = `
<div style="display: flex; align-items: center; justify-content: center; min-height: 36px;">No items</div>
`;
const emptyTemplate = createElementByHTML(EMPTY_TEMPLATE);

export class ItemsElm extends Elm {
  #valueField = "value";
  #textField = "text";
  #items = [];
  #elements = new Map();
  #itemValueState = new ElmValueState();
  #emptyElement = null;

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

    this.#itemValueState.beforeValueStateSet = (state) => {
      this.#validateItemValueState(state);
      this.beforeItemValueStateSet(state);
    };

    this.#itemValueState.afterValueStateSet = (state) => {
      this.afterItemValueStateSet(state);
    };
  }

  get textField() {
    return this.#textField;
  }

  get valueField() {
    return this.#valueField;
  }

  get itemValueState() {
    return this.#itemValueState;
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

    const exists =
      this.#emptyElement != null &&
      this.rootElement.contains(this.#emptyElement);

    if (!exists) {
      this.#emptyElement = null;
    }

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
    this.#setItems(items);

    // render items
    this.#setItemsRender(this.#items);
  }

  #setItems(items) {
    this.#items = isNullishOrEmpty(items)
      ? []
      : items.map((item) => ({ ...item }));

    this.afterSetItems(this.#items);
  }

  #setItemsRender(items) {
    // clear root element
    this.event.off({ element: this.rootElement, scope: "descendants" });
    this.rootElement.replaceChildren();

    for (const item of items) {
      this.renderItem(item);
    }

    this.afterRenderItems(items);

    this.#updateEmptyUIState();
  }

  afterSetItems(items) {
    // Override this method to perform actions after setting items.
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
    this.renderItem(addedItem);

    this.#updateEmptyUIState();
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

  afterUpdateItem(updatedItem) {
    // Override this method to perform actions after updating an item.
  }

  // render the updated item
  #updateItemRender(updatedItem) {
    this.renderUpdatedItem(updatedItem);
    this.#updateEmptyUIState();
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

    // perform any additional actions after removing an item

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

  afterRemoveItem(removedItem) {
    // Override this method to perform actions after removing an item.
  }

  #removeItemRender(removedItem) {
    this.renderRemovedItem(removedItem);
    this.#updateEmptyUIState();
  }

  renderRemovedItem(removedItem) {
    const value = removedItem[this.#valueField];
    this.dom.remove(value);
  }

  // -----------------------------------------------------------------------------
  // item access
  // -----------------------------------------------------------------------------

  getItemByValue(value, mode = null) {
    if (isNullishOrEmpty(value)) {
      return null;
    }

    if (mode != null) {
      if (![1, 2].includes(mode)) {
        throw new Error(`Invalid mode: ${mode}. Mode must be 1 or 2.`);
      }
    } else {
      mode = 1;
    }

    const assertionSubject = this.#valueField;

    if (mode === 1) {
      assertNonBlankString(value, assertionSubject);
      assertValueExists(value, this.itemValues, assertionSubject);

      const item = this.#items.find((item) => item[this.#valueField] === value);
      return { ...item };
    }

    assertNonEmptyNonBlankStringArray(value, assertionSubject);

    const items = this.#items.filter((item) =>
      value.includes(item[this.#valueField]),
    );
    return items.map((item) => ({ ...item }));
  }

  eachItem(callback) {
    assertFunction(callback, "callback");

    this.#items.forEach((item, index) => {
      const value = item[this.#valueField];
      const element = this.dom.has(value) ? this.dom.get(value) : null;

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

  #updateItemValueState() {
    const itemValues = this.itemValues;

    this.#itemValueState.forEach(({ key, value }) => {
      const filteredValue = this.#filterItemValue(value, itemValues);
      this.#itemValueState.setValue(key, filteredValue);
    });
  }

  #filterItemValue(value, itemValues = []) {
    if (isNullishOrEmpty(value) || isNullishOrEmpty(itemValues)) {
      return null;
    }

    const [normalizedValues, isArray] = normalizeArray(value);

    const filteredValues = normalizedValues.filter((v) =>
      itemValues.includes(v),
    );

    if (filteredValues.length === 0) {
      return null;
    }

    return isArray ? filteredValues : filteredValues[0];
  }

  #validateItemValueState({ newValue }) {
    if (isNullishOrEmpty(newValue)) {
      return;
    }

    const itemValues = this.itemValues;
    const [normalizedValues] = normalizeArray(newValue);

    for (const value of normalizedValues) {
      assertValueExists(value, itemValues, "value");
    }
  }

  beforeItemValueStateSet(state) {
    // Override in subclass if needed.
  }

  afterItemValueStateSet(state) {
    // Override in subclass if needed.
  }
}
