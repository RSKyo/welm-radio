import {
  assertNonBlankString,
  assertFunction,
  assertPlainObject,
  assertStringPlainObject,
  assertBoolean,
} from "./assert.js";
import { resolveElement } from "./helper.js";
import { ElmHandler } from "./elm-handler.js";
import { ElmEvent } from "./elm-event.js";

export class Elm {
  #rootElement;
  #options = {};
  #dataset = {};
  #handler = new ElmHandler();
  #offHandlers = [];
  #event = new ElmEvent();
  #rootElementResizeObserver;

  constructor(root, options = {}) {
    this.#rootElement = resolveElement(root);

    this.#initOptions(options);
    this.#initDataset();
    this.#initRootClass();
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

    const rootClassExtra =
      this.#options.rootClassExtra ?? this.#dataset.rootClassExtra;

    if (rootClassExtra != null) {
      assertNonBlankString(rootClassExtra, "rootClassExtra");

      const extraClasses = rootClassExtra.trim().split(/\s+/);
      this.#rootElement.classList.add(...extraClasses);
    }
  }

  get rootElement() {
    return this.#rootElement;
  }

  get options() {
    return { ...this.#options };
  }

  get dataset() {
    return { ...this.#dataset };
  }

  get handler() {
    return this.#handler;
  }

  get event() {
    return this.#event;
  }

  /** resize observer management */

  onResize(handler) {
    assertFunction(handler, "handler");

    this.#handler.on("resizeElement", handler);

    if (!this.#rootElementResizeObserver) {
      this.#rootElementResizeObserver = new ResizeObserver(() => {
        this.#handler.emit("resizeElement", {});
      });

      this.#rootElementResizeObserver.observe(this.#rootElement);
    }

    return () => {
      this.#handler.off("resizeElement", handler);
    };
  }

  /** Public option resolution methods */

  applyOption(key, handler) {
    return this.#resolveOption(key, handler, false);
  }

  applyRequiredOption(key, handler) {
    return this.#resolveOption(key, handler, true);
  }

  #resolveOption(key, handler, required) {
    assertNonBlankString(key, "key");
    assertFunction(handler, "handler");
    assertBoolean(required, "required");

    let value;
    let assertionSubject;

    if (Object.hasOwn(this.#options, key)) {
      value = this.#options[key];
      assertionSubject = `options.${key}`;
    } else if (Object.hasOwn(this.#dataset, key)) {
      value = this.#dataset[key];
      assertionSubject = `dataset.${key}`;
    } else {
      if (required) {
        throw new Error(`"${key}" is required`);
      }
      return;
    }

    handler(value, assertionSubject);

    return value;
  }

  registerOffHandler(off) {
    assertFunction(off, "off");
    this.#offHandlers.push(off);
  }

  destroy() {
    for (const off of this.#offHandlers) {
      off();
    }

    this.#offHandlers = [];

    this.#rootElementResizeObserver?.disconnect();
    this.#rootElementResizeObserver = null;

    this.#handler.off();
    this.#event.off();

    this.#rootElement = null;
  }
}
