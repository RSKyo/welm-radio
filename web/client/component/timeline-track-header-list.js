import { assertNonNegative, assertValueIn } from "./base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
  getBySelector,
} from "./base/elm-helper.js";
import { ItemsElm } from "./base/items-elm.js";
import { CompactCombobox } from "./combobox.js";
import { GainCompactSlider } from "./slider.js";

const ITEM_TEMPLATE = `
<div class="timeline-track-header" data-role="item">
  <div data-role="timeline-track-header-name"></div>
  <div data-role="timeline-track-header-gain"></div>
</div>
`;

const itemTemplate = createElementByHTML(ITEM_TEMPLATE);

export class TimelineTrackHeaderList extends ItemsElm {
  // state
  #itemElms = [];
  #selectedValue = null;
  #selectedValueMode = 1;
  // ruler
  #timelineRuler;
  // event
  #onSelectedChange;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "timeline-track-header-list",
    });

    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get selectedValueMode() {
    return this.#selectedValueMode;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get selectedValue() {
    return normalizeValue(this.#selectedValue, this.#selectedValueMode);
  }

  set selectedValue(value) {
    assertValueForMode(value, this.#selectedValueMode);
    const oldValue = this.#selectedValue;
    const newValue = normalizeValue(value, this.#selectedValueMode);

    if (isEqualValue(newValue, oldValue)) {
      return;
    }

    this.#selectedValue = newValue;

    this.#updateSelectedUIState();
    this.#emitSelectedChange(newValue);
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onSelectedChange(handler) {
    this.handler.set("selectedChangeHandler", handler);
  }

  #emitSelectedChange(value) {
    this.handler.emit("selectedChangeHandler", {
      elm: this,
      value,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "click", this.#itemClickHandler, {
      selector: '[data-role="item"]',
    });
  }

  #itemClickHandler = (event, { element }) => {
    const value = element.dataset.value;

    if (this.#selectedValueMode === 1) {
      this.selectedValue = value;
      return;
    }

    const oldValue = this.#selectedValue ?? [];
    const newValue = oldValue.includes(value)
      ? oldValue.filter((v) => v !== value)
      : [...oldValue, value];

    this.selectedValue = newValue;
  };

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateSelectedUIState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let selected = false;
      if (this.#selectedValueMode === 1) {
        selected = this.#selectedValue === value;
      } else {
        selected = this.#selectedValue?.includes(value) ?? false;
      }

      element.classList.toggle("is-selected", selected);
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);
  }

  // override
  createItemElement(item) {
    const value = item[this.valueField];

    const itemEl = itemTemplate.cloneNode(true);
    itemEl.dataset.value = value;

    const [nameEl, gainEl] = getBySelector(
      itemEl,
      '[data-role="timeline-track-header-name"]',
      '[data-role="timeline-track-header-gain"]',
    );

    const nameElm = new CompactCombobox(nameEl);
    nameElm.dropdownValues = getTrackNames();

    const gainSliderElm = new GainCompactSlider(gainEl);

    this.#itemElms.push({
      name: nameElm,
      gain: gainSliderElm,
    });

    return itemEl;
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedUIState();
  }
}

function getTrackNames() {
  return ["主持人", "嘉宾", "背景音乐", "环境音", "音效", "标识音"];
}
