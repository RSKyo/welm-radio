import { ElmDom } from "./elm-dom.js";
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

export class Elm {
  #rootElement;
  #dom;
  #dataset = {};
  #handlerMap = new Map();
  // event
  #rootElementResizeObserver;

  constructor(root, options = {}) {
    this.#rootElement = resolveElement(root);
    this.#dom = new ElmDom(this.#rootElement);

    this.#initOptions(options);

    this.#observeRootElementResize();
  }

  #initOptions(options) {
    // dataset
    initOption(options, "dataset", (value, assertionSubject) => {
      assertStringPlainObject(value, assertionSubject);

      for (const [k, v] of Object.entries(value)) {
        assertNonBlankString(v, `${assertionSubject}.${k}`);
      }

      for (const [k, v] of Object.entries(value)) {
        this.#rootElement.dataset[k] = v;
      }
    });

    this.#dataset = { ...this.#rootElement.dataset };

    // root class
    const rootClass =
      options.rootClass ?? this.dataset.rootClass ?? options.defaultRootClass;

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

  get dataset() {
    return { ...this.#dataset };
  }

  setHandler(name, handler) {
    assertNonBlankString(name, "name");

    if (handler != null) {
      assertFunction(handler, "handler");
      this.#handlerMap.set(name, handler);
    } else {
      this.#handlerMap.delete(name);
    }
  }

  emit(name, detail) {
    this.#handlerMap.get(name)?.({
      elm: this,
      ...detail,
    });
  }

  #observeRootElementResize() {
    this.#rootElementResizeObserver?.disconnect();

    this.#rootElementResizeObserver = new ResizeObserver(() => {
      this.rootElementResize();
    });

    this.#rootElementResizeObserver.observe(this.rootElement);
  }

  rootElementResize() {
    // Override this method to handle root element resize events
  }

  initOption(options, key, handler, fallbackHandler) {
    initOption(options, key, handler, fallbackHandler);
  }

  resolveElement(target, assertionSubject = "target", options = {}) {
    return resolveElement(target, assertionSubject, options);
  }

  queryElements(element, ...selectors) {
    return queryElements(element, ...selectors);
  }

  closestElement(event, selector, handler, fallbackHandler) {
    return closestElement(event, selector, handler, fallbackHandler);
  }

  normalizeArray(value) {
    return normalizeArray(value);
  }

  destroy() {
    this.#rootElementResizeObserver?.disconnect();
    this.#dom.clear();
  }
}

function initOption(options, key, handler, fallbackHandler) {
  assertPlainObject(options, "options");
  assertNonBlankString(key, "key");

  if (handler != null) {
    assertFunction(handler, "handler");
  }

  if (fallbackHandler != null) {
    assertFunction(fallbackHandler, "fallbackHandler");
  }

  const assertionSubject = `options.${key}`;

  if (Object.hasOwn(options, key)) {
    handler?.(options[key], assertionSubject);
  } else {
    fallbackHandler?.(assertionSubject);
  }
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

  return selectors.map((sel) => {
    const el = element.querySelector(sel);
    assertHtmlElement(el, `element matching selector "${sel}"`);
    return el;
  });
}

function closestElement(event, selector, handler, fallbackHandler) {
  assertNonBlankString(selector, "selector");
  if (handler != null) {
    assertFunction(handler, "handler");
  }

  if (fallbackHandler != null) {
    assertFunction(fallbackHandler, "fallbackHandler");
  }

  const { target, currentTarget } = event;

  if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
    return null;
  }

  const element = target.closest(selector);
  if (element == null || !currentTarget.contains(element)) {
    fallbackHandler?.();
    return null;
  }

  handler?.(element);
  return element;
}

function normalizeArray(value) {
  if (isNullish(value)) {
    return [[], false];
  }
  return Array.isArray(value) ? [value, true] : [[value], false];
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
