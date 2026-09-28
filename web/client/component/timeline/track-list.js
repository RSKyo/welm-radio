import {
  assertNonNegative,
  assertPlainObjectArray,
  assertPositive,
  assertValueIn,
} from "../base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
  getBySelector,
} from "../base/elm-helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { ClipGroup } from "./clip-group.js";

const DEFAULT_TRACK_MIN_HEIGHT = 132;
const TRACK_TEMPLATE = `
<div class="track" data-role="track">
  <div data-role="clip-group">
  </div>
</div>
`;

const trackTemplate = createElementByHTML(TRACK_TEMPLATE);

export class TrackList extends ItemsElm {
  // state
  #selectedValue = null;
  #selectedValueMode = 1;
  #pixelsPerSecond = 0;
  #duration = 0;
  #trackWidth = 0;
  #height = DEFAULT_TRACK_MIN_HEIGHT;
  // ClipGroup component map
  #clipGroupMap = new Map();

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "track-list",
    });

    this.#init();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });

    this.resolveOption("trackWidth", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#trackWidth = value;
    });

    this.resolveOption("height", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      if (value < DEFAULT_TRACK_MIN_HEIGHT) {
        throw new Error(
          `height cannot be less than ${DEFAULT_TRACK_MIN_HEIGHT}`,
        );
      }
      this.#height = value;
      this.rootElement.style.setProperty("--track-height", `${this.#height}px`);
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

    for (const clipGroupElm of this.#clipGroupMap.values()) {
      clipGroupElm.pixelsPerSecond = this.#pixelsPerSecond;
    }
  }

  get trackWidth() {
    return this.#trackWidth;
  }

  set trackWidth(value) {
    assertNonNegative(value, "trackWidth");
    this.#setTrackWidth(value);
  }

  #setTrackWidth(value) {
    if (value === this.#trackWidth) {
      return;
    }

    this.#trackWidth = value;

    this.#updateTrackWidthUIState();
  }

  // -----------------------------------------------------------------------------
  // methods
  // -----------------------------------------------------------------------------

  #getMaxDuration() {
    let maxDuration = 0;

    for (const clipGroupElm of this.#clipGroupMap.values()) {
      maxDuration = Math.max(maxDuration, clipGroupElm.duration);
    }

    return maxDuration;
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
      selector: '[data-role="track"]',
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

  #updateTrackWidthUIState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      element.style.width = `${this.#trackWidth}px`;
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);

    for (const clipGroupElm of this.#clipGroupMap.values()) {
      clipGroupElm.destroy();
    }

    this.#clipGroupMap.clear();
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);

    const value = removedItem[this.valueField];
    const clipGroupElm = this.#clipGroupMap.get(value);

    clipGroupElm?.destroy();
    this.#clipGroupMap.delete(value);
  }

  // override
  afterUpdateItem(updatedItem) {
    const value = updatedItem[this.valueField];
    const clipGroupElm = this.#clipGroupMap.get(value);

    clipGroupElm?.destroy();
    this.#clipGroupMap.delete(value);
  }

  // override
  createItemElement(item) {
    const value = item[this.valueField];

    const itemEl = trackTemplate.cloneNode(true);
    itemEl.dataset.value = value;
    itemEl.style.width = `${this.#width}px`;

    const clipGroupEl = getBySelector(itemEl, '[data-role="clip-group"]');

    const clipGroupElm = new ClipGroup(clipGroupEl, {
      valueField: "clipId",
      pixelsPerSecond: this.#pixelsPerSecond,
      minClipGroupHeight: DEFAULT_TRACK_MIN_HEIGHT,
    });

    if (item.clips != null) {
      assertPlainObjectArray(item.clips);

      for (const clip of item.clips) {
        clipGroupElm.addItem(clip);
      }
    }

    clipGroupElm.onDurationChange = () => {
      const newDuration = this.#getMaxDuration();
      this.#setDuration(newDuration);
    };

    clipGroupElm.onHeightChange = ({ elm, height }) => {
      elm.rootElement.parentElement.style.height = `${height}px`;
    };

    this.#clipGroupMap.set(value, clipGroupElm);

    return itemEl;
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedUIState();
  }

  // override
  afterRenderItem(addedItem) {
    const newDuration = this.#getMaxDuration();
    this.#setDuration(newDuration);
  }

  // override
  afterRenderUpdatedItem(updatedItem) {
    const newDuration = this.#getMaxDuration();
    this.#setDuration(newDuration);
  }

  // override
  afterRenderRemovedItem(removedItem) {
    const newDuration = this.#getMaxDuration();
    this.#setDuration(newDuration);
  }
  // ---------------------------------------------------------------------------
  // add clip to track
  // ---------------------------------------------------------------------------

  addClip(trackValue, clip) {
    const clipGroupElm = this.#clipGroupMap.get(trackValue);

    if (!clipGroupElm) {
      throw new Error(`track not found: ${trackValue}`);
    }

    clipGroupElm.addItem(clip);
  }
}
