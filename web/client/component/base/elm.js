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

  #resolveElement(target, assertionSubject = "target") {
    assertNonBlankStringOrHtmlElement(target, assertionSubject);

    if (isHtmlElement(target)) {
      return target;
    }

    target = target.trim();

    let element;

    if (target.startsWith("<") && target.endsWith(">")) {
      element = createElementByHTML(target);
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

    assertHtmlElement(element, assertionSubject);

    return element;
  }

  resolveElement(target, assertionSubject = "target") {
    return this.#resolveElement(target, assertionSubject);
  }

  createElementByHTML(html, assertionSubject = "html") {
    return createElementByHTML(html, assertionSubject);
  }

  createElementsByHTML(html, assertionSubject = "html") {
    return createElementsByHTML(html, assertionSubject);
  }

  normalizeArray(value) {
    return Array.isArray(value) ? [value, true] : [[value], false];
  }
}

function createElementByHTML(html, assertionSubject = "html") {
  const elements = createElementsByHTML(html, assertionSubject);

  if (elements.length !== 1) {
    throw new Error(
      `${assertionSubject} must contain exactly one root element`,
    );
  }

  return elements[0];
}

function createElementsByHTML(html, assertionSubject = "html") {
  assertNonBlankString(html, assertionSubject);

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const elements = [...template.content.children];

  for (const element of elements) {
    assertHtmlElement(element, assertionSubject);
  }

  return elements;
}
