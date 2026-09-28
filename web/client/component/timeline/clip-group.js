import { assertPositive } from "../base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
} from "../base/elm-helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { Clip } from "./clip.js";

const DEFAULT_CLIP_HEIGHT = 40;
const DEFAULT_CLIP_ROW_GAP = 4;
const DEFAULT_CLIP_GROUP_MIN_HEIGHT = 132;

const CLIP_TEMPLATE = `
<div data-role="clip">
</div>
`;

const clipTemplate = createElementByHTML(CLIP_TEMPLATE);

export class ClipGroup extends ItemsElm {
  // state
  #selectedValue = null;
  #selectedValueMode = 1;
  #pixelsPerSecond = 0;
  #duration = 0;
  #height = DEFAULT_CLIP_GROUP_MIN_HEIGHT;
  // clip component map
  #clipMap = new Map();

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "clip-group",
    });

    this.#init();
    this.#bindEvents();
    this.#updateHeightUIState();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get duration() {
    return this.#duration;
  }

  #setDuration(value) {
    if (value === this.#duration) {
      return;
    }

    this.#duration = value;

    this.#emitDurationChange(this.#duration);
  }

  get height() {
    return this.#height;
  }

  #setHeight(value) {
    if (value === this.#height) {
      return;
    }

    this.#height = value;

    this.#updateHeightUIState();

    this.#emitHeightChange(this.#height);
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  /** selected value (read-write) */

  get selectedValue() {
    return normalizeValue(this.#selectedValue, this.#selectedValueMode);
  }

  set selectedValue(value) {
    assertValueForMode(value, this.#selectedValueMode);
    this.#setSelectedValue(value);
  }

  #setSelectedValue(value, { updateUI = true } = {}) {
    const oldValue = this.#selectedValue;
    const newValue = normalizeValue(value, this.#selectedValueMode);

    if (isEqualValue(newValue, oldValue)) {
      return;
    }

    this.#selectedValue = newValue;

    if (updateUI) {
      this.#updateSelectedUIState();
    }

    this.#emitSelectedChange(newValue);
  }

  /** pixelsPerSecond value (read-write) */

  get pixelsPerSecond() {
    return this.#pixelsPerSecond;
  }

  set pixelsPerSecond(value) {
    assertPositive(value, "pixelsPerSecond");
    this.#setPixelsPerSecond(value);
  }

  #setPixelsPerSecond(value) {
    if (value === this.#pixelsPerSecond) {
      return;
    }

    this.#pixelsPerSecond = value;

    for (const clipElm of this.#clipMap.values()) {
      clipElm.pixelsPerSecond = value;
    }
  }

  // -----------------------------------------------------------------------------
  // methods
  // -----------------------------------------------------------------------------

  #getMaxClipEnd() {
    let maxClipEnd = 0;

    for (const clipElm of this.#clipMap.values()) {
      maxClipEnd = Math.max(maxClipEnd, clipElm.clipEnd);
    }

    return maxClipEnd;
  }

  #calculateHeight() {
    let maxRowIndex = 0;

    for (const clipElm of this.#clipMap.values()) {
      maxRowIndex = Math.max(maxRowIndex, clipElm.rowIndex);
    }

    const height =
      (maxRowIndex + 1) * (DEFAULT_CLIP_HEIGHT + DEFAULT_CLIP_ROW_GAP);
    return Math.max(height, DEFAULT_CLIP_GROUP_MIN_HEIGHT);
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

  set onHeightChange(handler) {
    this.handler.set("heightChangeHandler", handler);
  }

  #emitHeightChange(height) {
    this.handler.emit("heightChangeHandler", {
      elm: this,
      height,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "click", this.#itemClickHandler, {
      selector: '[data-role="clip"]',
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
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    const itemValues = this.itemValues;
    const newSelectedValue = filterValue(this.#selectedValue, itemValues);
    this.#setSelectedValue(newSelectedValue, { updateUI: false });

    // clear all clipElm
    for (const clipElm of this.#clipMap.values()) {
      clipElm.destroy();
    }
    this.#clipMap.clear();
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    const newSelectedValue = filterValue(this.#selectedValue, itemValues);
    this.#setSelectedValue(newSelectedValue, { updateUI: false });

    const value = removedItem[this.valueField];
    const clipElm = this.#clipMap.get(value);

    clipElm?.destroy();
    this.#clipMap.delete(value);
  }

  // override
  afterUpdateItem(updatedItem) {
    const value = updatedItem[this.valueField];
    const clipElm = this.#clipMap.get(value);

    clipElm?.destroy();
    this.#clipMap.delete(value);
  }

  // override
  createItemElement(item) {
    const value = item[this.valueField];

    const itemEl = clipTemplate.cloneNode(true);
    itemEl.dataset.value = value;

    const clipElm = new Clip(itemEl, {
      ...item,
      pixelsPerSecond: this.#pixelsPerSecond,
      height: DEFAULT_CLIP_HEIGHT,
      rowGap: DEFAULT_CLIP_ROW_GAP,
    });

    clipElm.onClipEndChange = () => {
      const newDuration = this.#getMaxClipEnd();
      this.#setDuration(newDuration);
    };

    clipElm.onRowIndexChange = () => {
      const newHeight = this.#calculateHeight();
      this.#setHeight(newHeight);
    };

    this.#clipMap.set(value, clipElm);

    return itemEl;
  }

  // override
  afterRenderItems(items) {
    const newDuration = this.#getMaxClipEnd();
    this.#setDuration(newDuration);

    const newHeight = this.#calculateHeight();
    this.#setHeight(newHeight);

    this.#updateSelectedUIState();
  }

  // override
  afterRenderItem(addedItem) {
    const newDuration = this.#getMaxClipEnd();
    this.#setDuration(newDuration);

    const newHeight = this.#calculateHeight();
    this.#setHeight(newHeight);
  }

  // override
  afterRenderUpdatedItem(updatedItem) {
    const newDuration = this.#getMaxClipEnd();
    this.#setDuration(newDuration);

    const newHeight = this.#calculateHeight();
    this.#setHeight(newHeight);
  }

  // override
  afterRenderRemovedItem(removedItem) {
    const newDuration = this.#getMaxClipEnd();
    this.#setDuration(newDuration);

    const newHeight = this.#calculateHeight();
    this.#setHeight(newHeight);
  }

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

  #updateHeightUIState() {
    this.rootElement.style.height = `${this.#height}px`;
  }
}
