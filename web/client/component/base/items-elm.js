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
import {
  createElementByHTML,
  normalizeArray,
  normalizeValue,
  assertValueForMode,
} from "./elm-helper.js";

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

    this.resolveOption("valueField", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#valueField = value;
    });

    this.resolveOption("textField", (value, assertionSubject) => {
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

  // Internal items for this class and subclasses. Do not mutate directly.
  get items() {
    return this.#items;
  }

  getItems() {
    return this.#items.map((item) => ({ ...item }));
  }

  setItems(items, assertionSubject = "items") {
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

    this.#setItems(items, assertionSubject);
    this.#setItemsRender(this.#items, assertionSubject);
  }

  #setItems(items, assertionSubject = "items") {
    this.#items = isNullishOrEmpty(items)
      ? []
      : items.map((item) => ({ ...item }));

    this.afterSetItems(this.#items, assertionSubject);
  }

  afterSetItems(items, assertionSubject = "items") {
    // Override this method to perform actions after setting items.
  }

  #setItemsRender(items, assertionSubject = "items") {
    // clear root element
    this.event.off({ element: this.rootElement, scope: "descendants" });
    this.rootElement.replaceChildren();
    this.#elements.clear();
    this.#emptyElement = null;

    this.beforeRenderItems(items, assertionSubject);

    for (const item of items) {
      this.renderItem(item, `${assertionSubject}.item`);
      this.afterRenderItem(item, `${assertionSubject}.item`);
    }

    this.afterRenderItems(items, assertionSubject);

    this.#updateEmptyUIState();
  }

  beforeRenderItems(items, assertionSubject = "items") {
    // Override this method to perform actions before rendering items.
  }

  renderItem(item, assertionSubject = "item") {
    // add the item element to the DOM
    const element = this.createItemElement(item, assertionSubject);
    this.rootElement.append(element);

    // store the element in the internal map for later reference
    this.#elements.set(item[this.#valueField], element);
  }

  createItemElement(item, assertionSubject = "item") {
    throw new Error("createItemElement must be implemented by the subclass.");
  }

  afterRenderItem(item, assertionSubject = "item") {
    // Override this method to perform actions after rendering an item.
  }

  afterRenderItems(items, assertionSubject = "items") {
    // Override this method to perform actions after rendering items.
  }

  // -----------------------------------------------------------------------------
  // add item
  // -----------------------------------------------------------------------------

  addItem(item, assertionSubject = "item") {
    // check
    assertPlainObject(item, assertionSubject, this.#valueField);

    const value = item[this.#valueField];

    assertNonBlankString(value, `${assertionSubject}.${this.#valueField}`);
    assertValueNotExists(
      value,
      this.itemValues,
      `${assertionSubject}.${this.#valueField}`,
    );

    // add item
    const addedItem = this.#addItem(item, assertionSubject);

    // render the added item
    this.#addItemRender(addedItem, assertionSubject);

    return { ...addedItem };
  }

  #addItem(item, assertionSubject = "item") {
    const addedItem = { ...item };
    this.#items.push(addedItem);

    this.afterAddItem(addedItem, assertionSubject);

    return addedItem;
  }

  afterAddItem(addedItem, assertionSubject = "item") {
    // Override this method to perform actions after adding an item.
  }

  #addItemRender(addedItem, assertionSubject = "item") {
    this.renderItem(addedItem, assertionSubject);
    this.afterRenderItem(addedItem, assertionSubject);
    this.#updateEmptyUIState();
  }

  // -----------------------------------------------------------------------------
  // update item
  // -----------------------------------------------------------------------------

  updateItem(item, assertionSubject = "item") {
    // check
    assertPlainObject(item, assertionSubject, this.#valueField);

    const value = item[this.#valueField];

    assertNonBlankString(value, `${assertionSubject}.${this.#valueField}`);
    assertValueExists(
      value,
      this.itemValues,
      `${assertionSubject}.${this.#valueField}`,
    );

    // update item
    const updatedItem = this.#updateItem(item, assertionSubject);

    // render the updated item
    this.#updateItemRender(updatedItem, assertionSubject);

    return { ...updatedItem };
  }

  // Update the item in the internal list.
  #updateItem(item, assertionSubject = "item") {
    const updatedItem = { ...item };
    const index = this.#items.findIndex(
      (findItem) => findItem[this.#valueField] === item[this.#valueField],
    );

    this.#items[index] = updatedItem;

    this.afterUpdateItem(updatedItem, assertionSubject);

    return updatedItem;
  }

  afterUpdateItem(updatedItem, assertionSubject = "item") {
    // Override this method to perform actions after updating an item.
  }

  // render the updated item
  #updateItemRender(updatedItem, assertionSubject = "item") {
    this.renderUpdatedItem(updatedItem, assertionSubject);
    this.afterRenderUpdatedItem(updatedItem, assertionSubject);
    this.#updateEmptyUIState();
  }

  // render updated item
  renderUpdatedItem(updatedItem, assertionSubject = "item") {
    // replace the old element with the new element in the DOM
    const oldElement = this.#elements.get(updatedItem[this.#valueField]);
    const newElement = this.createItemElement(updatedItem);
    this.event.migrate(oldElement, newElement);
    oldElement.replaceWith(newElement);

    // update the internal map with the new element
    this.#elements.set(updatedItem[this.#valueField], newElement);
  }

  afterRenderUpdatedItem(updatedItem, assertionSubject = "item") {
    // Override this method to perform actions after updating an item.
  }

  // -----------------------------------------------------------------------------
  // remove item
  // -----------------------------------------------------------------------------

  removeItem(value, assertionSubject = this.#valueField) {
    assertNonBlankString(value, assertionSubject);
    assertValueExists(value, this.itemValues, assertionSubject);

    // remove item
    const removedItem = this.#removeItem(value);

    // render the removed item
    this.#removeItemRender(removedItem, assertionSubject);

    return { ...removedItem };
  }

  // Remove the item from the internal list by its value.
  #removeItem(value, assertionSubject = this.#valueField) {
    let removedItem = null;
    this.#items = this.#items.filter((item) => {
      if (item[this.#valueField] === value) {
        removedItem = item;
        return false;
      }
      return true;
    });

    this.afterRemoveItem(removedItem, assertionSubject);

    return removedItem;
  }

  afterRemoveItem(removedItem, assertionSubject = this.#valueField) {
    // Override this method to perform actions after removing an item.
  }

  #removeItemRender(removedItem, assertionSubject = this.#valueField) {
    this.renderRemovedItem(removedItem, assertionSubject);
    this.afterRenderRemovedItem(removedItem, assertionSubject);
    this.#updateEmptyUIState();
  }

  renderRemovedItem(removedItem, assertionSubject = this.#valueField) {
    const value = removedItem[this.#valueField];

    // remove element from the DOM
    const element = this.#elements.get(value);
    this.event.off({ element, scope: "subtree" });
    element.remove();

    // remove element from internal map
    this.#elements.delete(value);
  }

  afterRenderRemovedItem(removedItem, assertionSubject = this.#valueField) {
    // Override this method to perform actions after rendering a removed item.
  }

  // -----------------------------------------------------------------------------
  // item access
  // -----------------------------------------------------------------------------

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
      return { ...item };
    }

    assertNonEmptyNonBlankStringArray(normalizedValue, assertionSubject);

    const items = this.#items.filter((item) =>
      normalizedValue.includes(item[this.#valueField]),
    );
    return items.map((item) => ({ ...item }));
  }

  eachItem(callback) {
    assertFunction(callback, "callback");

    this.#items.forEach((item, index) => {
      const value = item[this.#valueField];
      const element = this.#elements.get(value) ?? null;

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
}
