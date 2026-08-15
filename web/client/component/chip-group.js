import {
  createElementByHTML,
  validateItemFields,
  filterValue,
  validateModeValue,
  validateValue,
  validateValueExists,
  dispatchEvent,
  dispatchItemEvent,
  isEqualValue,
  isNullOrEmpty,
} from "./elm-helper.js";
import { ItemsElm } from "./elm.js";

const DEFAULT_ITEM_ELEMENT_HTML = `
<div class="chip-group-item" data-role="item">
  <span class="chip-group-text" data-role="text"></span>
</div>
`;
const DEFAULT_FOOTER_ELEMENT_HTML = `
<div class="chip-group-actions" data-role="actions">
  <button type="button" class="chip-group-action" data-action="select-all">全选</button>
  <button type="button" class="chip-group-action" data-action="unselect">取消</button>
</div>
`;

export class ChipGroup extends ItemsElm {
  // templates
  #itemElementTemplate;
  #footerElementTemplate;
  // state
  #mode = "multiple";
  #value;
  #valueMode = 2;
  // event
  #onChange;

  constructor(root, options = {}) {
    const rootClass = options.rootClass ?? "chip-group";

    const dataset = options.dataset ?? {};
    if (options.name != null) {
      dataset.name = options.name;
    }

    super(root, {
      ...options,

      rootClass,
      dataset,
    });

    if (options.mode != null) {
      if (!["single", "multiple"].includes(options.mode)) {
        throw new Error("mode must be either 'single' or 'multiple'");
      }

      this.#mode = options.mode;
      this.#valueMode = this.#mode === "single" ? 1 : 2;
    }

    this.#initTemplates(options);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // templates
  // -----------------------------------------------------------------------------

  #initTemplates(options) {
    const itemElementHTML =
      options.itemElementHTML ?? DEFAULT_ITEM_ELEMENT_HTML;
    this.#itemElementTemplate = createElementByHTML(itemElementHTML);

    if (options.itemElementHTML != null) {
      this.#validateItemElementTemplate(this.#itemElementTemplate);
    }

    const footerElementHTML =
      options.footerElementHTML ?? DEFAULT_FOOTER_ELEMENT_HTML;
    this.#footerElementTemplate = createElementByHTML(footerElementHTML);

    if (options.footerElementHTML != null) {
      this.#validateFooterElementTemplate(this.#footerElementTemplate);
    }
  }

  #validateItemElementTemplate(element) {
    // querySelector will not match the itemElement itself,
    // so we use matches to check for the itemElement itself
    if (!element.matches('[data-role="item"]')) {
      throw new Error("itemElement must have data-role='item'");
    }

    if (!element.querySelector('[data-role="text"]')) {
      throw new Error(
        "itemElement must have a child element with data-role='text'",
      );
    }
  }

  #validateFooterElementTemplate(element) {
    if (!element.matches('[data-role="actions"]')) {
      throw new Error("footerElement must have data-role='actions'");
    }

    const selectAllButton = element.querySelector(
      '[data-role="action"][data-action="select-all"]',
    );
    if (!selectAllButton) {
      throw new Error(
        "footerElement must have a child button with data-role='action' and data-action='select-all'",
      );
    }

    const unselectButton = element.querySelector(
      '[data-role="action"][data-action="unselect"]',
    );
    if (!unselectButton) {
      throw new Error(
        "footerElement must have a child button with data-role='action' and data-action='unselect'",
      );
    }
  }

  // -----------------------------------------------------------------------------
  // value
  // -----------------------------------------------------------------------------
  get value() {
    return this.#value;
  }

  getValue() {
    if (this.#value == null) {
      return null;
    }

    if (this.#valueMode === 2) {
      return this.#value.length > 0 ? [...this.#value] : null;
    }

    return this.#value;
  }

  setValue(value) {
    const oldValue = this.#value;

    if (isNullOrEmpty(value)) {
      this.#value = null;
    } else {
      validateModeValue(value, this.#valueMode);
      validateValue(value);
      validateValueExists(value, this.items, this.valueField);

      this.#value = this.#valueMode === 1 ? value : [...value];
    }

    const newValue = this.#value;
    if (!isEqualValue(newValue, oldValue)) {
      this.#updateSelectedState();

      this.#onChange?.({
        target: this,
        value: Array.isArray(newValue) ? [...newValue] : newValue,
        item: this.getItemByValue(newValue),
      });
    }
  }

  selectAll() {
    if (this.#valueMode !== 2) {
      throw new Error("selectAll is only available in multiple mode");
    }

    const values = this.items.map((item) => item[this.valueField]);
    this.setValue(values);
  }

  unselect() {
    this.setValue(null);
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

  set onChange(handler) {
    // handler can be null to remove the event listener
    this.#onChange = handler == null ? null : handler;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    const clickItemHandler = ({ value }) => {
      if (this.#valueMode === 1) {
        this.setValue(this.#value === value ? null : value);
        return;
      }

      const oldValue = this.#value ?? [];
      const newValue = oldValue.includes(value)
        ? oldValue.filter((v) => v !== value)
        : [...oldValue, value];

      this.setValue(newValue);
    };

    const clickActionHandler = ({ target }) => {
      if (target.dataset.action === "select-all") {
        this.selectAll();
      } else if (target.dataset.action === "unselect") {
        this.unselect();
      }
    };

    this.rootElement.addEventListener("click", (event) => {
      dispatchItemEvent('[data-role="item"]', event, clickItemHandler);

      dispatchEvent("[data-action]", event, clickActionHandler);
    });
  }

  // -----------------------------------------------------------------------------
  // rendering and updating the DOM
  // -----------------------------------------------------------------------------

  // override
  createItemElement(item) {
    const text = item[this.textField];
    const value = item[this.valueField];
    const tooltip = item[this.tooltipField];

    const itemElement = this.#itemElementTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    itemElement.querySelector("[data-role='text']").textContent = text;
    itemElement.title = tooltip || text || "";

    return itemElement;
  }

  createFooterElement() {
    if (this.#valueMode === 2) {
      const footerElement = this.#footerElementTemplate.cloneNode(true);
      return footerElement;
    }
  }

  // override
  afterRender(items) {
    if (isNullOrEmpty(items)) {
      this.#value = null;
    } else {
      this.#value = filterValue(this.#value, items, this.valueField);

      this.#updateState();
    }
  }

  // override
  afterUpdateItem(newItem) {
    this.#updateState();
  }

  #updateState() {
    this.#updateSelectedState();
  }

  #updateSelectedState() {
    this.root.each((key, element) => {
      if (this.#valueMode === 1) {
        element.classList.toggle("is-selected", this.#value === key);
      } else if (this.#valueMode === 2) {
        element.classList.toggle(
          "is-selected",
          this.#value?.includes(key) ?? false,
        );
      }
    });
  }
}

export class SoloChipGroup extends ChipGroup {
  constructor(root, options = {}) {
    super(root, {
      ...options,
      mode: "single",
    });
  }
}

export class MultiChipGroup extends ChipGroup {
  constructor(root, options = {}) {
    super(root, {
      ...options,
      mode: "multiple",
    });
  }
}
