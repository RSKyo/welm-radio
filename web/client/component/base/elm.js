import { ElmDom } from "./elm-dom.js";
import {
  isHtmlElement,
  assertNonBlankStringOrHtmlElement,
  assertHtmlElement,
  assertNonBlankString,
  assertPlainObject,
  assertStringPlainObject,
} from "./assert.js";

export class Elm {
  #rootElement;
  #dom;
  #dataset = {};

  constructor(root, options = {}) {
    this.#rootElement = this.#resolveElement(root);

    assertPlainObject(options, "options");
    this.#dom = new ElmDom(this.#rootElement);

    if (options.rootClass != null) {
      assertNonBlankString(options.rootClass, "rootClass");
      this.#rootElement.classList.add(options.rootClass);
    }

    if (options.dataset != null) {
      assertStringPlainObject(options.dataset, "dataset");

      for (const [key, value] of Object.entries(options.dataset)) {
        this.#rootElement.dataset[key] = value;
      }
    }

    this.#dataset = { ...this.#rootElement.dataset };
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

  #resolveElement(target, fieldName = "target") {
    assertNonBlankStringOrHtmlElement(target, fieldName);

    if (isHtmlElement(target)) {
      return target;
    }

    target = target.trim();

    let element;

    if (target.startsWith("<") && target.endsWith(">")) {
      element = this.#createElementByHTML(target);
    } else if (target.startsWith("#")) {
      element = document.getElementById(target.slice(1));
    } else {
      try {
        element = document.querySelector(target);
      } catch {
        throw new Error(`${fieldName} must be a valid CSS selector: ${target}`);
      }
    }

    assertHtmlElement(element, fieldName);

    return element;
  }

  resolveElement(target, fieldName = "target") {
    return this.#resolveElement(target, fieldName);
  }

  #createElementByHTML(html, fieldName = "html") {
    assertNonBlankString(html, fieldName);

    const template = document.createElement("template");
    template.innerHTML = html.trim();

    const { children } = template.content;

    if (children.length !== 1) {
      throw new Error("html must contain exactly one root element");
    }

    const element = children[0];
    assertHtmlElement(element, fieldName);

    return element;
  }

  createElementByHTML(html, fieldName = "html") {
    return this.#createElementByHTML(html, fieldName);
  }

  normalizeArray(value) {
    return Array.isArray(value) ? [value, true] : [[value], false];
  }
}
