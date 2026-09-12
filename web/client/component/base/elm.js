import {
  isNullish,
  isHtmlElement,
  assertNonBlankStringOrHtmlElement,
  assertHtmlElement,
  assertNonBlankString,
  assertFunction,
  assertPlainObject,
  assertStringPlainObject,
  assertElementMatches,
  assertElementContains,
  assertNonEmptyNonBlankStringArray,
} from "./assert.js";
import { ElmDom } from "./elm-dom.js";
import { ElmValueState } from "./elm-state.js";

export class Elm {
  #rootElement;
  #dom;
  #options = {};
  #dataset = {};
  #handlerMap = new Map();
  #valueState = new ElmValueState();
  // event
  #rootElementResizeObserver;

  constructor(root, options = {}) {
    this.#rootElement = resolveElement(root);
    this.#dom = new ElmDom(this.#rootElement);

    this.#initOptions(options);
    this.#initDataset();
    this.#initRootClass();

    this.#valueState.beforeSetStateValueHandler =
      this.beforeSetStateValue.bind(this);
    this.#valueState.afterSetStateValueHandler =
      this.afterSetStateValue.bind(this);
  }

  #initOptions(options) {
    assertPlainObject(options, "options");
    this.#options = { ...options };
  }

  #initDataset() {
    if (this.#options.dataset != null) {
      const assertionSubject = "options.dataset";
      const value = this.#options.dataset;

      assertStringPlainObject(value, assertionSubject);

      for (const [k, v] of Object.entries(value)) {
        assertNonBlankString(v, `${assertionSubject}.${k}`);
      }

      for (const [k, v] of Object.entries(value)) {
        this.#rootElement.dataset[k] = v;
      }
    }

    this.#dataset = { ...this.#rootElement.dataset };
  }

  #initRootClass() {
    const rootClass =
      this.#options.rootClass ??
      this.#dataset.rootClass ??
      this.#options.defaultRootClass;

    if (rootClass != null) {
      assertNonBlankString(rootClass, "rootClass");

      const classes = rootClass.trim().split(/\s+/);
      this.#rootElement.classList.add(...classes);
    }
  }

  get rootElement() {
    return this.#rootElement;
  }

  get dom() {
    return this.#dom;
  }

  get options() {
    return { ...this.#options };
  }

  get dataset() {
    return { ...this.#dataset };
  }

  /** handler management */

  setHandler(name, handler) {
    assertNonBlankString(name, "name");

    if (handler != null) {
      assertFunction(handler, "handler");
      this.#handlerMap.set(name, handler);
    } else {
      this.#handlerMap.delete(name);
    }
  }

  emit(name, detail = {}) {
    assertNonBlankString(name, "name");
    assertPlainObject(detail, "detail");

    this.#handlerMap.get(name)?.({
      ...detail,
      elm: this,
    });
  }

  /** state value management */

  get valueStateKeys() {
    return this.#valueState.keys;
  }

  get valueStateValues() {
    return this.#valueState.values;
  }

  initValueState(key, value = null, mode = 1) {
    this.#valueState.init(key, value, mode);
  }

  getState(key) {
    return this.#valueState.get(key);
  }

  getStateValue(key) {
    return this.#valueState.getValue(key);
  }

  getStateMode(key) {
    return this.#valueState.getMode(key);
  }

  setStateValue(key, value) {
    this.#valueState.set(key, value);
  }

  beforeSetStateValue(state) {
    // Override if needed.
  }

  afterSetStateValue(state) {
    // Override if needed.
  }

  eachValueState(callback) {
    this.#valueState.each(callback);
  }

  /** resize observer management */

  set onResize(handler) {
    this.setHandler("resize", handler);

    this.#rootElementResizeObserver?.disconnect();
    this.#rootElementResizeObserver = null;

    if (handler == null) {
      return;
    }

    this.#rootElementResizeObserver = new ResizeObserver(() => {
      this.emit("resize", {});
    });

    this.#rootElementResizeObserver.observe(this.#rootElement);
  }

  /** public option resolution */

  resolveOption(key, handler, fallbackHandler) {
    assertNonBlankString(key, "key");

    if (handler != null) {
      assertFunction(handler, "handler");
    }

    if (fallbackHandler != null) {
      assertFunction(fallbackHandler, "fallbackHandler");
    }

    let value;
    let assertionSubject;

    if (Object.hasOwn(this.#options, key)) {
      value = this.#options[key];
      assertionSubject = `options.${key}`;
    } else if (Object.hasOwn(this.#dataset, key)) {
      value = this.#dataset[key];
      assertionSubject = `dataset.${key}`;
    } else {
      fallbackHandler?.(key);
      return;
    }

    handler?.(value, assertionSubject);

    return value;
  }

  resolveElement(target, assertionSubject = "target", options = {}) {
    return resolveElement(target, assertionSubject, options);
  }

  queryElements(element, ...selectors) {
    return queryElements(element, ...selectors);
  }

  normalizeArray(value) {
    return normalizeArray(value);
  }

  isEqualValue(value1, value2) {
    return isEqualValue(value1, value2);
  }

  destroy() {
    this.#rootElementResizeObserver?.disconnect();
    this.#rootElementResizeObserver = null;

    this.#handlerMap.clear();
    this.#dom.destroy();

    this.#dom = null;
    this.#rootElement = null;
  }
}

function createElementByHTML(html, assertionSubject = "html") {
  assertNonBlankString(html, assertionSubject);

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const { children } = template.content;
  if (children.length !== 1) {
    throw new Error(
      `${assertionSubject} must contain exactly one root element`,
    );
  }

  const element = children[0];
  assertHtmlElement(element, assertionSubject);

  return element;
}

function resolveElement(target, assertionSubject = "target", options = {}) {
  assertNonBlankStringOrHtmlElement(target, assertionSubject);
  assertPlainObject(options, "options");

  let element;
  if (isHtmlElement(target)) {
    element = target;
  } else {
    target = target.trim();

    if (target.startsWith("<") && target.endsWith(">")) {
      element = createElementByHTML(target, assertionSubject);
    } else if (target.startsWith("#")) {
      element = document.getElementById(target.slice(1));
    } else {
      try {
        element = document.querySelector(target);
      } catch {
        throw new Error(
          `${assertionSubject} must be a valid CSS selector: ${target}`,
        );
      }
    }
  }

  assertHtmlElement(element, assertionSubject);

  const [matches] = normalizeArray(options.matches);
  const [contains] = normalizeArray(options.contains);

  for (const selector of matches) {
    assertNonBlankString(selector, "matches selector");
    assertElementMatches(element, selector, assertionSubject);
  }

  for (const selector of contains) {
    assertNonBlankString(selector, "contains selector");
    assertElementContains(element, selector, assertionSubject);
  }

  return element;
}

function queryElements(element, ...selectors) {
  assertHtmlElement(element, "element");
  assertNonEmptyNonBlankStringArray(selectors, "selectors");

  return selectors.map((selector) => {
    let el;

    try {
      el = element.querySelector(selector);
    } catch {
      throw new Error(`selector must be a valid CSS selector: ${selector}`);
    }

    assertHtmlElement(el, `element matching selector "${selector}"`);

    return el;
  });
}

function normalizeArray(value) {
  if (isNullish(value)) {
    return [[], false];
  }
  return Array.isArray(value) ? [value, true] : [[value], false];
}

function isEqualValue(value1, value2) {
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
