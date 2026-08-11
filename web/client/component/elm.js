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
