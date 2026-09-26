import {
  assertNonNegative,
  assertPositive,
  assertValueIn,
} from "../base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
} from "../base/elm-helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { Clip } from "./clip.js";

const ITEM_TEMPLATE = `
<div data-role="item">
</div>
`;

const itemTemplate = createElementByHTML(ITEM_TEMPLATE);

export class ClipGroup extends ItemsElm {
  // state
  #selectedValue = null;
  #selectedValueMode = 1;
  #pixelsPerSecond = 0;
  #duration = 0;

  #itemClipMap = new Map();

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "clip-group",
    });

    this.#init();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get duration() {
    return this.#duration;
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

    for (const clipElm of this.#itemClipMap.values()) {
      clipElm.pixelsPerSecond = value;
    }
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

  set onDurationChange(handler) {
    this.handler.set("durationChangeHandler", handler);
  }

  #emitDurationChange(duration) {
    this.handler.emit("durationChangeHandler", {
      elm: this,
      duration,
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

    for (const clipElm of this.#itemClipMap.values()) {
      clipElm.destroy();
    }

    this.#itemClipMap.clear();
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);

    const value = removedItem[this.valueField];
    const clipElm = this.#itemClipMap.get(value);

    clipElm?.destroy();
    this.#itemClipMap.delete(value);
  }

  // override
  afterUpdateItem(updatedItem) {
    const value = updatedItem[this.valueField];
    const clipElm = this.#itemClipMap.get(value);

    clipElm?.destroy();
    this.#itemClipMap.delete(value);
  }

  // override
  createItemElement(item) {
    const value = item[this.valueField];

    const itemEl = itemTemplate.cloneNode(true);
    itemEl.dataset.value = value;

    const clipElm = new Clip(itemEl, {
      ...item,
      pixelsPerSecond: this.#pixelsPerSecond,
    });

    clipElm.onClipEndChange = () => {
      this.#updateDuration();
    };

    this.#itemClipMap.set(value, clipElm);

    return itemEl;
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedUIState();
  }

  // override
  afterRenderItem(addedItem) {
    this.#updateDuration();
  }

  // override
  afterRenderUpdatedItem(updatedItem) {
    this.#updateDuration();
  }

  // override
  afterRenderRemovedItem(removedItem) {
    this.#updateDuration();
  }

  #updateDuration() {
    const newDuration = this.#getClipGroupEnd();

    if (newDuration === this.#duration) {
      return;
    }

    this.#duration = newDuration;

    this.#emitDurationChange(this.#duration);
  }

  #getClipGroupEnd() {
    let clipGroupEnd = 0;

    for (const clipElm of this.#itemClipMap.values()) {
      clipGroupEnd = Math.max(clipGroupEnd, clipElm.clipEnd);
    }

    return clipGroupEnd;
  }
}
