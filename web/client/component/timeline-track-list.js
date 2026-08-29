import { ItemsElm } from "./base/items-elm.js";
import {
  isNullishOrEmpty,
  assertBoolean,
  assertNonBlankString,
  assertFunction,
  assertPositiveInteger,
  assertValueIn,
} from "./base/assert.js";

const ROOT_CLASS = "timeline-track-list";
const ITEM_TEMPLATE = `
<div class="timeline-track" data-role="item">
  timeline track list item
</div>
`;

export class TimelineTrackList extends ItemsElm {
  // templates
  #itemTemplate;
  // state
  #selectedValue;
  #selectedValueMode = 1;
  // event
  #onSelectedChange;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });

    this.#initItemTemplate(options.itemTemplate);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // templates
  // -----------------------------------------------------------------------------

  #initItemTemplate(target) {
    if (target == null) {
      this.#itemTemplate = this.createElementByHTML(
        ITEM_TEMPLATE,
        "ITEM_TEMPLATE",
      );
      return;
    }

    const fieldName = "options.itemTemplate";
    assertNonBlankString(target, fieldName);
    const itemTemplate = this.resolveElement(target, fieldName);
    assertElementMatches(itemTemplate, '[data-role="item"]', fieldName);

    this.#itemTemplate = itemTemplate;
  }

  // -----------------------------------------------------------------------------
  // selected value
  // -----------------------------------------------------------------------------

  getSelectedValue() {
    if (isNullishOrEmpty(this.#selectedValue)) {
      return null;
    }
    return this.#selectedValueMode === 2
      ? [...this.#selectedValue]
      : this.#selectedValue;
  }

  setSelectedValue(value) {
    this.validateValueByMode(value, this.#selectedValueMode);

    const oldValue = this.#selectedValue;
    if (isNullishOrEmpty(value)) {
      this.#selectedValue = null;
    } else {
      this.validateValueExists(value);
      this.#selectedValue = this.#selectedValueMode === 2 ? [...value] : value;
    }

    const newValue = this.#selectedValue;
    if (!this.isEqualValue(newValue, oldValue)) {
      this.#updateSelectedState();

      this.#onSelectedChange?.({
        value: this.getSelectedValue(),
        item: this.getItem(newValue),
      });
    }
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

  set onSelectedChange(handler) {
    if (handler != null) {
      assertFunction(handler, "handler");
      this.#onSelectedChange = handler;
      return;
    }

    // handler can be null to remove the event listener
    this.#onSelectedChange = null;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.dom.onRoot("click", this.#handleRootClick);
  }

  #handleRootClick = (event, { targetClosest }) => {
    targetClosest('[data-role="item"]', ({ target }) => {
      const value = target.dataset.value;

      if (this.#selectedValueMode === 1) {
        this.setSelectedValue(value);
        return;
      }

      const oldValue = this.#selectedValue ?? [];
      const newValue = oldValue.includes(value)
        ? oldValue.filter((v) => v !== value)
        : [...oldValue, value];

      this.setSelectedValue(newValue);
    });
  };

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateSelectedState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let selected = false;
      if (this.#selectedValueMode === 1) {
        selected = this.#selectedValue === value;
      } else if (this.#selectedValueMode === 2) {
        selected = this.#selectedValue?.includes(value) ?? false;
      }

      element.classList.toggle("is-selected", selected);
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  renderItem(item) {
    const value = item[this.valueField];
    const text = item[this.textField];
    const tooltip = item[this.tooltipField];

    const itemElement = this.#itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;

    this.dom.add(value, itemElement);
  }

  // Override
  onItemsChange(items) {}

  // override
  afterRender(items) {
    // this.#updateSelectedState();
  }
}
