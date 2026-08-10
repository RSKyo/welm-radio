/**
 * UI element base classes.
 *
 * This file provides the base classes for welm UI components:
 *
 * - Elm:
 *   The base class for UI elements. It manages the root HTMLElement,
 *   root CSS class, and common element-related features.
 *
 * - CollectionElm:
 *   An extension of Elm for components that manage item collections.
 *   It provides item storage, field mapping, and item validation.
 *
 * Naming:
 * Elm is a name created for the welm project.
 * It was chosen for its concise form and artistic feeling,
 * rather than as a technical abbreviation.
 *
 * The name later happened to resemble "Element", which also fits
 * its role as a lightweight UI element abstraction.
 *
 * @version 1.0.0
 * @updated 2026-08-10
 */

/**
 * Base class for welm UI elements.
 *
 * Elm manages the root HTMLElement of a component and provides
 * common element-level features.
 *
 * Features:
 * - Resolve and validate the root element.
 * - Apply an optional root CSS class.
 * - Expose the root element and dataset.
 *
 * Subclasses should extend Elm to implement specific UI behavior.
 */
export class Elm {
  #root;
  #rootClass;

  constructor(root, options = {}) {
    this.#rootClass = options.rootClass ?? null;
    this.#root = this.#initRootElement(root, this.#rootClass);
  }

  get root() {
    return this.#root;
  }

  get rootClass() {
    return this.#rootClass;
  }

  get dataset() {
    return this.#root.dataset;
  }

  // init root element
  #initRootElement(root, rootClass) {
    if (root == null) {
      throw new Error("root must be provided");
    }

    if (
      rootClass != null &&
      (!this.#isNonBlankString(rootClass) || /\s/.test(rootClass))
    ) {
      throw new Error("rootClass must be a single non-blank CSS class name");
    }

    let el;

    if (this.#isNonBlankString(root)) {
      const selector = root.startsWith("#") ? root : `#${root}`;

      el = document.querySelector(selector);

      if (!el) {
        throw new Error(`element not found: ${selector}`);
      }
    } else if (root instanceof HTMLElement) {
      el = root;
    } else {
      throw new Error("root must be a non-blank string or an HTMLElement");
    }

    if (rootClass) {
      el.classList.add(rootClass);
    }

    return el;
  }

  #isNonBlankString(value) {
    return typeof value === "string" && value.trim() !== "";
  }
}

/**
 * Base class for UI components that manage item collections.
 *
 * CollectionElm extends Elm with common collection-related features:
 *
 * - Store and update items.
 * - Define text/value fields used by items.
 * - Validate item structure.
 *
 * Subclasses can extend CollectionElm to implement specific
 * collection UI behaviors, such as lists, groups, or selectors.
 */
export class CollectionElm extends Elm {
  #textField;
  #valueField;
  #items;
  #value;
  #valueMode;
  #isMultipleValueMode;

  constructor(root, options = {}) {
    super(root, options);

    this.#textField = options.textField ?? "text";
    this.#valueField = options.valueField ?? "value";
    this.#validateField(this.#textField, this.#valueField);

    this.#items = [];
    this.#value = null;

    this.#valueMode = options.valueMode ?? "multiple"; // "single" or "multiple"
    if (!["single", "multiple"].includes(this.#valueMode)) {
      throw new Error("valueMode must be either 'single' or 'multiple'");
    }

    this.#isMultipleValueMode = this.#valueMode === "multiple";
  }

  /** field */

  get textField() {
    return this.#textField;
  }

  get valueField() {
    return this.#valueField;
  }

  /** items */

  get items() {
    return this.#items.map((item) => ({ ...item }));
  }

  setItems(items) {
    if (items == null) {
      this.#items = [];
      this.#value = null;
      return;
    }

    this.#validateItems(items, this.#textField, this.#valueField);
    this.#items = items.map((item) => ({ ...item }));

    this.#value = this.#filterValue(this.#value, this.#items, this.#valueField);
  }

  /** item */

  get item() {
    if (this.#value == null) {
      return null;
    }

    if (this.#isMultipleValueMode) {
      return this.#items
        .filter((item) => this.#value.includes(item[this.#valueField]))
        .map((item) => ({ ...item }));
    }

    return {
      ...this.#items.find((item) => item[this.#valueField] === this.#value),
    };
  }

  updateItem(newItem) {
    if (newItem == null) {
      throw new Error("newItem must be provided");
    }

    this.#validateItem(newItem, this.#textField, this.#valueField);

    const value = newItem[this.#valueField];
    const index = this.#items.findIndex(
      (item) => item[this.#valueField] === value,
    );

    if (index === -1) {
      throw new Error(`item not found: ${value}`);
    }

    this.#items[index] = { ...newItem };
  }

  /** value */

  get value() {
    if (this.#value == null) {
      return null;
    }

    if (this.#isMultipleValueMode) {
      return [...this.#value];
    }

    return this.#value;
  }

  setValue(value) {
    if (value == null) {
      this.#value = null;
      return;
    }

    this.#validateModeValue(value, this.#valueMode);
    this.#validateValue(value, this.#items, this.#valueField);

    if (this.#isMultipleValueMode) {
      this.#value = [...value];
      return;
    }

    this.#value = value;
  }

  #validateField(textField, valueField) {
    if (!this.#isNonBlankString(textField)) {
      throw new Error("textField must be a non-blank string");
    }

    if (!this.#isNonBlankString(valueField)) {
      throw new Error("valueField must be a non-blank string");
    }
  }

  #validateItems(items, textField, valueField) {
    if (!Array.isArray(items)) {
      throw new Error("items must be an array");
    }

    const values = new Set();

    for (const item of items) {
      this.#validateItem(item, textField, valueField);

      const value = item[valueField];

      if (values.has(value)) {
        throw new Error(`duplicate item value: ${value}`);
      }

      values.add(value);
    }
  }

  #validateItem(item, textField, valueField) {
    if (!this.#isPlainObject(item)) {
      throw new Error("item must be a plain object");
    }

    if (!Object.hasOwn(item, textField)) {
      throw new Error(`item is missing the ${textField} field`);
    }

    if (!Object.hasOwn(item, valueField)) {
      throw new Error(`item is missing the ${valueField} field`);
    }

    if (!this.#isNonBlankString(item[textField])) {
      throw new Error(`item.${textField} must be a non-blank string`);
    }

    if (!this.#isNonBlankString(item[valueField])) {
      throw new Error(`item.${valueField} must be a non-blank string`);
    }
  }

  #filterValue(value, items, valueField) {
    if (value == null) {
      return null;
    }

    const isArray = Array.isArray(value);
    const values = isArray ? [...value] : [value];
    const itemValues = items.map((item) => item[valueField]);

    const filteredValues = values.filter((v) => itemValues.includes(v));

    if (filteredValues.length === 0) {
      return null;
    }

    return isArray ? filteredValues : filteredValues[0];
  }

  #validateModeValue(value, valueMode) {
    if (valueMode === "multiple") {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(
          "value must be a non-empty array in multiple value mode",
        );
      }

      if (value.length !== new Set(value).size) {
        throw new Error("value array must not contain duplicates");
      }
    } else if (valueMode === "single") {
      if (!this.#isNonBlankString(value)) {
        throw new Error(
          "value must be a non-blank string in single value mode",
        );
      }
    } else {
      throw new Error("valueMode must be either 'single' or 'multiple'");
    }
  }

  #validateValue(value, items, valueField) {
    const isArray = Array.isArray(value);
    const values = isArray ? [...value] : [value];
    const itemValues = items.map((item) => item[valueField]);

    for (const v of values) {
      if (!this.#isNonBlankString(v)) {
        if (isArray) {
          throw new Error("value array must contain only non-blank strings");
        }
        throw new Error("value must be a non-blank string");
      }

      if (!itemValues.includes(v)) {
        throw new Error(`value not found: ${v}`);
      }
    }
  }

  #isNonBlankString(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  #isPlainObject(value) {
    if (Object.prototype.toString.call(value) !== "[object Object]") {
      return false;
    }

    const proto = Object.getPrototypeOf(value);

    return proto === Object.prototype || proto === null;
  }
}
