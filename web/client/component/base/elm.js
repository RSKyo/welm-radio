import { ElmDom } from "./elm-dom.js";
import {
  isNullish,
  isNonBlankString,
  isHtmlElement,
  assertSelectorOrHtmlElement,
  assertHtmlElement,
  assertNonBlankString,
  assertPlainObject,
  assertStringPlainObject,
  assertNonEmptyNonBlankStringArray,
  assertNoDuplicateValues,
} from "./assert.js";

export class Elm {
  #rootClass;
  #dataset;
  #rootElement;
  #dom;

  constructor(root, options = {}) {
    this.#init(root, options);
  }

  init(root, options = {}) {
    this.#init(root, options);
  }

  #init(root, options = {}) {
    assertPlainObject(options, "options");

    const oldRootClass = this.#rootClass;
    if (options.rootClass != null) {
      assertNonBlankString(options.rootClass, "rootClass");
      this.#rootClass = options.rootClass;
    }

    const oldDataset = this.#dataset;
    if (options.dataset != null) {
      assertStringPlainObject(options.dataset, "dataset");
      this.#dataset = options.dataset;
    }

    if (root == null) {
      this.#dom?.destroy();
      this.#rootElement = null;
      this.#dom = null;
      return;
    }

    const oldRootElement = this.#rootElement;
    const rootElement = this.#resolveElement(root);
    const isSameRoot = oldRootElement === rootElement;

    if (isSameRoot && oldRootClass != null) {
      oldRootElement.classList.remove(oldRootClass);
    }

    if (isSameRoot && oldDataset != null) {
      for (const key of Object.keys(oldDataset)) {
        delete oldRootElement.dataset[key];
      }
    }

    if (isSameRoot) {
      this.#dom?.clear();
    } else {
      this.#dom = new ElmDom(rootElement);
    }

    this.#rootElement = rootElement;

    if (this.#rootClass != null) {
      this.#rootElement.classList.add(this.#rootClass);
    }

    if (this.#dataset != null) {
      for (const [key, value] of Object.entries(this.#dataset)) {
        this.#rootElement.dataset[key] = value;
      }
    }
  }

  get rootElement() {
    return this.#rootElement;
  }

  get dom() {
    return this.#dom;
  }

  #resolveElement(target) {
    assertSelectorOrHtmlElement(target, "target");

    if (isHtmlElement(target)) {
      return target;
    }

    const element = target.startsWith("#")
      ? document.getElementById(target.slice(1))
      : document.querySelector(target);

    assertHtmlElement(element, "target");

    return element;
  }

  resolveElement(target) {
    return this.#resolveElement(target);
  }

  createElementByHTML(html) {
    assertNonBlankString(html, "html");

    const template = document.createElement("template");
    template.innerHTML = html.trim();

    const { children } = template.content;

    if (children.length !== 1) {
      throw new Error("html must contain exactly one root element");
    }

    const element = children[0];
    assertHtmlElement(element, "html");

    return element;
  }

  normalizeArray(value) {
    return Array.isArray(value) ? [value, true] : [[value], false];
  }
}
