import { ElmDom } from "./elm-dom.js";

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
    const oldRootClass = this.#rootClass;
    if (options.rootClass != null) {
      assertClassName(options.rootClass, "rootClass");
      this.#rootClass = options.rootClass;
    }

    const oldDataset = this.#dataset;
    if (options.dataset != null) {
      assertDataset(options.dataset, "dataset");
      this.#dataset = options.dataset;
    }

    if (root == null) {
      this.#dom?.destroy();
      this.#rootElement = null;
      this.#dom = null;
      return;
    }

    let rootElement = root;

    if (isNonBlankString(root)) {
      if (root.startsWith("#")) {
        root = root.slice(1);
      }
      rootElement = document.getElementById(root);
    }

    if (!rootElement || !(rootElement instanceof HTMLElement)) {
      throw new Error("root element not found or invalid");
    }

    const oldRootElement = this.#rootElement;
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

  createElementByHTML(html) {
    if (!isNonBlankString(html)) {
      throw new Error("html must be a non-blank HTML string");
    }

    const template = document.createElement("template");
    template.innerHTML = html.trim();

    const { children } = template.content;

    if (children.length !== 1) {
      throw new Error("html must contain exactly one root element");
    }

    const element = children[0];

    if (!(element instanceof HTMLElement)) {
      throw new Error("html must create an HTMLElement");
    }

    return element;
  }
}

// ----------------------------------------------
// Private helper
// ----------------------------------------------

function assertClassName(className, fieldName = "className") {
  if (!isNonBlankString(className) || /\s/.test(className)) {
    throw new Error(`${fieldName} must be a single non-blank CSS class name`);
  }
}

function assertDataset(dataset, fieldName = "dataset") {
  if (!isPlainObject(dataset)) {
    throw new Error(`${fieldName} must be a plain object`);
  }

  for (const [key, value] of Object.entries(dataset)) {
    if (!isNonBlankString(key)) {
      throw new Error(`${fieldName} key must be a non-blank string`);
    }

    if (!isNonBlankString(value)) {
      throw new Error(`${fieldName}.${key} value must be a non-blank string`);
    }
  }
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}
