import {
  assertNonBlankString,
  assertFunction,
  assertPlainObject,
  assertStringPlainObject,
} from "./assert.js";
import { resolveElement } from "./elm-helper.js";
import { ElmDom } from "./elm-dom.js";
import { ElmValueState } from "./elm-state.js";
import { ElmHandlerRegistry } from "./elm-handler.js";

export class Elm {
  #rootElement;
  #dom;
  #options = {};
  #dataset = {};
  #handlerRegistry = new ElmHandlerRegistry();
  #valueState = new ElmValueState();
  // event
  #rootElementResizeObserver;

  constructor(root, options = {}) {
    this.#rootElement = resolveElement(root);
    this.#dom = new ElmDom(this.#rootElement);

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

  get handlerRegistry() {
    return this.#handlerRegistry;
  }

  get valueState() {
    return this.#valueState;
  }

  /** resize observer management */

  set onResize(handler) {
    this.#rootElementResizeObserver?.disconnect();
    this.#rootElementResizeObserver = null;

    if (handler == null) {
      this.#handlerRegistry.remove("resize");
      return;
    }

    assertFunction(handler, "handler");
    this.#handlerRegistry.set("resize", handler);

    this.#rootElementResizeObserver = new ResizeObserver(() => {
      this.#handlerRegistry.emit("resize", {});
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

  destroy() {
    this.#rootElementResizeObserver?.disconnect();
    this.#rootElementResizeObserver = null;

    this.#handlerRegistry.clear();
    this.#valueState.clear();
    this.#dom.destroy();

    this.#dom = null;
    this.#rootElement = null;
  }
}
