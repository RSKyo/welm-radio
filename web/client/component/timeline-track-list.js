import {
  assertNonNegative,
  assertPositive,
  assertValueIn,
} from "./base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
  getBySelector,
} from "./base/elm-helper.js";
import { ItemsElm } from "./base/items-elm.js";
import { TimelineClipGroup } from "./timeline-clip-group.js";

const ITEM_TEMPLATE = `
<div class="timeline-track" data-role="item">
  <div data-role="clip-group">
  </div>
</div>
`;

const itemTemplate = createElementByHTML(ITEM_TEMPLATE);

export class TimelineTrackList extends ItemsElm {
  // state
  #selectedValue = null;
  #selectedValueMode = 1;
  #pixelsPerSecond = 0;
  #width = 0;
  #itemClipGroupMap = new Map();

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "timeline-track-list",
    });

    this.#init();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("selectedValueMode", (value, assertionSubject) => {
      assertValueIn(value, [1, 2], assertionSubject);
      this.#selectedValueMode = value;
    });

    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });

    this.resolveOption("width", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#width = value;
    });

    this.resolveOption("height", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.rootElement.style.setProperty(
        "--timeline-track-height",
        `${value}px`,
      );
    });
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

  get pixelsPerSecond() {
    return this.#pixelsPerSecond;
  }

  set pixelsPerSecond(value) {
    assertNonNegative(value, "pixelsPerSecond");
    this.#setPixelsPerSecond(value);
  }

  #setPixelsPerSecond(value) {
    if (value === this.#pixelsPerSecond) {
      return;
    }

    this.#pixelsPerSecond = value;

    for (const clipGroupElm of this.#itemClipGroupMap.values()) {
      clipGroupElm.pixelsPerSecond = value;
    }
  }

  get width() {
    return this.#width;
  }

  set width(value) {
    assertNonNegative(value, "width");
    this.#setWidth(value);
  }

  #setWidth(value) {
    if (value === this.#width) {
      return;
    }

    this.#width = value;
    this.#updateWidthUIState();
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

  #updateWidthUIState() {
    this.eachItem(({ element }) => {
      if (!element) return;
      element.style.width = `${this.#width}px`;
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);

    for (const clipGroupElm of this.#itemClipGroupMap.values()) {
      clipGroupElm.destroy();
    }

    this.#itemClipGroupMap.clear();
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);

    const value = removedItem[this.valueField];
    const clipGroupElm = this.#itemClipGroupMap.get(value);

    clipGroupElm?.destroy();
    this.#itemClipGroupMap.delete(value);
  }

  // override
  createItemElement(item) {
    const value = item[this.valueField];

    const itemEl = itemTemplate.cloneNode(true);
    itemEl.dataset.value = value;
    itemEl.style.width = `${this.#width}px`;

    const clipGroupEl = getBySelector(itemEl, '[data-role="clip-group"]');

    const clipGroupElm = new TimelineClipGroup(clipGroupEl, {
      pixelsPerSecond: this.#pixelsPerSecond,
    });

    this.#itemClipGroupMap.set(value, clipGroupElm);

    return itemEl;
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedUIState();
  }
  // ---------------------------------------------------------------------------
  // add clip to track
  // ---------------------------------------------------------------------------

  addClip(trackValue, clip) {
    const clipGroupElm = this.#itemClipGroupMap.get(trackValue);

    if (!clipGroupElm) {
      throw new Error(`track not found: ${trackValue}`);
    }

    clipGroupElm.addItem(clip);
  }
}
