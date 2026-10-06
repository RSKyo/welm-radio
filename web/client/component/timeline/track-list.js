import {
  assertNonNegative,
  assertPlainObjectArray,
  assertPositive,
  assertValueExists,
  assertPlainObject,
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
  #playheadTime = 0;
  // ClipGroup component map
  #clipGroupMap = new Map();

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "track-list",
      valueField: "trackId",
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

    this.rootElement.style.setProperty(
      "--track-height",
      `${DEFAULT_TRACK_MIN_HEIGHT}px`,
    );
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

  /** pixels per second (read-write) */

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

    for (const clipGroupElm of this.#clipGroupMap.values()) {
      clipGroupElm.pixelsPerSecond = this.#pixelsPerSecond;
    }
  }

  /** playhead time (read-write) */

  get playheadTime() {
    return this.#playheadTime;
  }

  set playheadTime(value) {
    assertNonNegative(value, "playheadTime");

    if (value === this.#playheadTime) {
      return;
    }

    this.#playheadTime = value;

    for (const clipGroupElm of this.#clipGroupMap.values()) {
      clipGroupElm.playheadTime = value;
    }
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

  addClip(trackValue, clip) {
    const itemValues = this.itemValues;
    assertValueExists(trackValue, itemValues);
    assertPlainObject(clip, "clip");

    const clipGroupElm = this.#clipGroupMap.get(trackValue);

    if (!clipGroupElm) {
      throw new Error(`track not found: ${trackValue}`);
    }

    clipGroupElm.addItem(clip);
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

  set onTrackHeightChange(handler) {
    this.handler.set("trackHeightChangeHandler", handler);
  }

  #emitTrackHeightChange(value, height) {
    this.handler.emit("trackHeightChangeHandler", {
      elm: this,
      value,
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
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    const itemValues = this.itemValues;
    const newSelectedValue = filterValue(this.#selectedValue, itemValues);
    this.#setSelectedValue(newSelectedValue, { updateUI: false });

    // clear all clipGroupElm
    for (const clipGroupElm of this.#clipGroupMap.values()) {
      clipGroupElm.destroy();
    }
    this.#clipGroupMap.clear();
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    const newSelectedValue = filterValue(this.#selectedValue, itemValues);
    this.#setSelectedValue(newSelectedValue, { updateUI: false });

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

    const clipGroupEl = getBySelector(itemEl, '[data-role="clip-group"]');

    const clipGroupElm = new ClipGroup(clipGroupEl, {
      pixelsPerSecond: this.#pixelsPerSecond,
      playheadTime: this.#playheadTime,
    });

    clipGroupElm.onDurationChange = () => {
      const newDuration = this.#getMaxDuration();
      this.#setDuration(newDuration);
    };

    clipGroupElm.onHeightChange = ({ height }) => {
      itemEl.style.height = `${height}px`;

      this.#emitTrackHeightChange(value, height);
    };

    if (item.clips != null) {
      assertPlainObjectArray(item.clips);

      for (const clip of item.clips) {
        clipGroupElm.addItem(clip);
      }
    }

    this.#clipGroupMap.set(value, clipGroupElm);

    return itemEl;
  }

  // override
  afterRenderItems(items) {
    const newDuration = this.#getMaxDuration();
    this.#setDuration(newDuration);

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
}
