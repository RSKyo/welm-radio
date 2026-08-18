import { ElmDom } from "./elmdom.js";

export class Elm {
  #rootClass;
  #dataset;
  #rootElement;
  #dom;

  constructor(root, options = {}) {
    this.#rootClass = options.rootClass;
    this.#dataset = options.dataset;
    this.#rootElement = null;
    this.#dom = null;

    // If a root is provided, initialize the Elm instance with it.
    // If no root is provided, the Elm instance will be initialized later when init() is called.
    if (root != null) {
      this.init(root, { throwIfRootNotFound: false });
    }
  }

  get rootElement() {
    return this.#rootElement;
  }

  get dom() {
    return this.#dom;
  }

  init(root, options = {}) {
    const {
      rootClass = this.#rootClass,
      dataset = this.#dataset,
      throwIfRootNotFound = true,
    } = options;

    if (rootClass != null) {
      assertClassName(rootClass, "rootClass");
    }

    if (dataset != null) {
      assertDataset(dataset, "dataset");
    }

    let element = root;

    if (isNonBlankString(root)) {
      if (root.startsWith("#")) {
        root = root.slice(1);
      }
      element = document.getElementById(root);
    }

    if (!element || !(element instanceof HTMLElement)) {
      if (throwIfRootNotFound) {
        throw new Error("root element not found or invalid");
      }
      return;
    }

    const oldRootElement = this.#rootElement;
    const isSameRoot = oldRootElement === element;
    const oldRootClass = this.#rootClass;
    const oldDataset = this.#dataset;

    this.#dom?.clear();

    if (isSameRoot && oldRootClass != null) {
      oldRootElement.classList.remove(oldRootClass);
    }

    if (isSameRoot && oldDataset != null) {
      for (const key of Object.keys(oldDataset)) {
        delete oldRootElement.dataset[key];
      }
    }

    this.#rootElement = element;
    this.#dom = new ElmDom(element);

    if (rootClass != null) {
      this.#rootClass = rootClass;
      this.#rootElement.classList.add(rootClass);
    }

    if (dataset != null) {
      this.#dataset = dataset;
      for (const [key, value] of Object.entries(dataset)) {
        this.#rootElement.dataset[key] = value;
      }
    }
  }
}

// ----------------------------------------------
// Private helper
// ----------------------------------------------

function assertClassName(className, fieldName) {
  if (!isNonBlankString(className) || /\s/.test(className)) {
    throw new Error(`${fieldName} must be a single non-blank CSS class name`);
  }
}

function assertDataset(dataset, fieldName) {
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
