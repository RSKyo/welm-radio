import {
  assertPositive,
  assertNonNegative,
  assertValueForMode,
  assertPlainObject,
  assertNonBlankString,
} from "../base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  isEqualValue,
  filterValue,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { Clip } from "./clip.js";

const CLIP_MIN_DURATION = 0.05;
const CLIP_HEIGHT = 40;
const CLIP_ROW_GAP = 3;
const CLIP_ROW_HEIGHT = CLIP_HEIGHT + CLIP_ROW_GAP;
const SNAP_THRESHOLD = 5;

export const DEFAULT_CLIP_GROUP_MIN_HEIGHT = CLIP_ROW_HEIGHT * 3;
const EMPTY_TEMPLATE = `
<div class="empty-placeholder">No Clips</div>
`;
const CLIP_TEMPLATE = `
<div data-role="clip">
</div>
`;

const emptyTemplate = createElementByHTML(EMPTY_TEMPLATE);
const clipTemplate = createElementByHTML(CLIP_TEMPLATE);

export class ClipGroup extends ItemsElm {
  // state
  #trackId = null;
  #selectedValue = null;
  #selectedValueMode = 1;
  #pixelsPerSecond = 0;
  #duration = 0;
  #height = 0;

  #timelineRuler = null;
  #playheadTime = 0;
  // clip component map
  #clipMap = new Map();

  

  // dragging
  #dragMode = null;
  #draggingClipElm = null;
  #draggingElement = null;
  #draggingPointerId = null;
  #draggingGhostElement = null;
  #dragStartX = 0;

  #pendingMove = null;
  #pendingTrim = null;
  // audio cache
  #audioCache = null;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "clip-group",
      valueField: "clipId",
    });

    this.#init();
    this.#bindEvents();
    this.#updateHeightUIState();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("trackId", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#trackId = value;
    });

    if(this.#trackId == null) {
      throw new Error("clip group trackId is required");
    }

    this.resolveOption("timelineRuler", (value) => {
      this.#timelineRuler = value;
    });

    if (this.#timelineRuler == null) {
      throw new Error("Timeline ruler not found");
    }

    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });

    this.resolveOption("audioCache", (value, assertionSubject) => {
      this.#audioCache = value;
    });

    this.resolveOption("playheadTime", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#playheadTime = value;
    });

    this.#height = this.#calculateHeight();

    this.rootElement.style.setProperty(
      "--clip-row-height",
      `${CLIP_ROW_HEIGHT}px`,
    );

    this.rootElement.style.setProperty(
      "--clip-row-gap",
      `${CLIP_ROW_GAP}px`,
    );

    this.setItems(null);
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get trackId() {
    return this.#trackId;
  }
  
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

  get snapThreshold() {
    return SNAP_THRESHOLD;
  }

  get snapPoints() {
    const snapPoints = [];

    for (const clipElm of this.#clipMap.values()) {
      snapPoints.push(
        {
          time: clipElm.clipStart,
          type: "clip",
          clipId: clipElm.clipId,
          rowIndex: clipElm.rowIndex,
          edge: "start",
        },
        {
          time: clipElm.clipEnd,
          type: "clip",
          clipId: clipElm.clipId,
          rowIndex: clipElm.rowIndex,
          edge: "end",
        },
      );
    }

    return snapPoints;
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
    return this.#timelineRuler.pixelsPerSecond;
  }

  set pixelsPerSecond(value) {
    assertPositive(value, "pixelsPerSecond");
    this.#setPixelsPerSecond(value);
  }

  #setPixelsPerSecond(value) {
    // if (value === this.#pixelsPerSecond) {
    //   return;
    // }

    // this.#pixelsPerSecond = value;

    // for (const clipElm of this.#clipMap.values()) {
    //   clipElm.pixelsPerSecond = value;
    // }
  }

  /** playhead time (read-write) */

  get playheadTime() {
    return this.#playheadTime;
  }

  set playheadTime(value) {
    assertNonNegative(value, "playheadTime");
    this.#setPlayheadTime(value);
  }

  #setPlayheadTime(value) {
    if (value === this.#playheadTime) {
      return;
    }

    this.#playheadTime = value;
  }

  // ---------------------------------------------------------------------------
  // clip methods
  // ---------------------------------------------------------------------------

  addClip(clip) {
    assertPlainObject(clip, "clip");

    this.addItem(clip);
  }

  splitClip() {
    if (this.#selectedValue == null) {
      return "clip-not-selected";
    }

    const clipId = this.#selectedValue;
    const clipElm = this.#clipMap.get(clipId);

    if (!clipElm) {
      return "clip-not-found";
    }

    const splitTime = this.#playheadTime;

    if (splitTime <= clipElm.clipStart + CLIP_MIN_DURATION) {
      return "too-close-to-start";
    }

    if (splitTime >= clipElm.clipEnd - CLIP_MIN_DURATION) {
      return "too-close-to-end";
    }

    const originalClipItem = this.getItemByValue(clipId);

    const trimSplit =
      splitTime - originalClipItem.clipStart + originalClipItem.trimStart;

    const newClip = {
      ...originalClipItem,
      clipId: crypto.randomUUID(),
      clipStart: splitTime,
      trimStart: trimSplit,
    };

    originalClipItem.trimEnd = trimSplit;

    this.updateItem(originalClipItem, "update item for splitting clip");
    this.addItem(newClip);

    this.selectedValue = newClip.clipId;

    return "success";
  }

  duplicateClip() {
    if (this.#selectedValue == null) {
      return "clip-not-selected";
    }

    const clipId = this.#selectedValue;
    const clipElm = this.#clipMap.get(clipId);

    if (!clipElm) {
      return "clip-not-found";
    }

    const originalClipItem = this.getItemByValue(clipId);
    const newClip = {
      ...originalClipItem,
      clipId: crypto.randomUUID(),
      clipStart: clipElm.clipEnd,
    };

    this.addItem(newClip);
    this.selectedValue = newClip.clipId;

    return "success";
  }

  removeClip() {
    if (this.#selectedValue == null) {
      return "clip-not-selected";
    }

    const clipId = this.#selectedValue;
    const clipElm = this.#clipMap.get(clipId);

    if (!clipElm) {
      return "clip-not-found";
    }

    this.removeItem(clipId);
    this.selectedValue = null;

    return "success";
  }

  // -----------------------------------------------------------------------------
  // layout
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

    return (maxRowIndex + 1) * CLIP_ROW_HEIGHT;
    // return Math.max(height, DEFAULT_CLIP_GROUP_MIN_HEIGHT);
  }

  #isPlacementAvailable(clipId, clipStart, clipEnd, rowIndex) {
    for (const otherClipElm of this.#clipMap.values()) {
      if (otherClipElm.clipId === clipId) {
        continue;
      }

      if (otherClipElm.rowIndex !== rowIndex) {
        continue;
      }

      const overlaps =
        clipStart < otherClipElm.clipEnd && clipEnd > otherClipElm.clipStart;

      if (overlaps) {
        return false;
      }
    }

    return true;
  }

  #isRowAvailable(clipItem, rowIndex) {
    const clipStart = clipItem.clipStart;
    const clipEnd = Number(
      (clipStart + (clipItem.trimEnd - clipItem.trimStart)).toFixed(3),
    );

    return this.#isPlacementAvailable(
      clipItem[this.valueField],
      clipStart,
      clipEnd,
      rowIndex,
    );
  }

  #findAvailableRowIndex(clipItem) {
    const myRowIndex = clipItem.rowIndex ?? 0;
    if (this.#isRowAvailable(clipItem, myRowIndex)) {
      return myRowIndex;
    }

    let rowIndex = 0;
    while (
      rowIndex === myRowIndex ||
      !this.#isRowAvailable(clipItem, rowIndex)
    ) {
      rowIndex += 1;
    }

    return rowIndex;
  }

  resolveTime(localX) {
    return Math.max(0, localX / this.pixelsPerSecond);
  }

  resolveRowPosition(localY) {
    const rowIndex = Math.max(0, Math.floor(localY / CLIP_ROW_HEIGHT));
    let clipTop = rowIndex * CLIP_ROW_HEIGHT + CLIP_ROW_GAP;
    const offsetTop = CLIP_ROW_GAP === 0 ? 0 : (1 + (CLIP_ROW_GAP - 1) / 2);
    clipTop = clipTop - offsetTop;

    let top;
    if (Math.abs(localY - clipTop) < SNAP_THRESHOLD) {
      top = clipTop;
    } else {
      top = Math.max(0, localY);
    }

    return {
      rowIndex,
      clipTop,
      top,
      clipRowHeight: CLIP_ROW_HEIGHT,
      clipRowGap: CLIP_ROW_GAP,
      snapThreshold: SNAP_THRESHOLD,
    };
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onSelectedChange(handler) {
    this.handler.on("selectedChangeHandler", handler);
  }

  #emitSelectedChange(value) {
    this.handler.emit("selectedChangeHandler", {
      elm: this,
      value,
      clip: this.#clipMap.get(value) ?? null,
    });
  }

  set onDurationChange(handler) {
    this.handler.on("durationChangeHandler", handler);
  }

  #emitDurationChange(duration) {
    this.handler.emit("durationChangeHandler", {
      elm: this,
      duration,
    });
  }

  set onHeightChange(handler) {
    this.handler.on("heightChangeHandler", handler);
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

  #bindEvents() {}

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  createEmptyElement() {
    return emptyTemplate.cloneNode(true);
  }

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
  createItemElement(item) {
    const value = item[this.valueField];
    const itemEl = clipTemplate.cloneNode(true);
    itemEl.dataset.value = value;

    const clipOptions = {
      ...item,
      pixelsPerSecond: this.pixelsPerSecond,
      height: CLIP_HEIGHT,
      rowGap: CLIP_ROW_GAP,
      audioCache: this.#audioCache,
    };

    const clipRowIndex = this.#findAvailableRowIndex(clipOptions);
    item.rowIndex = clipRowIndex;

    clipOptions.rowIndex = clipRowIndex;

    const clipElm = new Clip(itemEl, clipOptions);

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

  renderUpdatedItem(updatedItem, assertionSubject = "item") {
    const value = updatedItem[this.valueField];
    const clipElm = this.#clipMap.get(value);

    if (!clipElm) {
      return;
    }

    clipElm.setTrimStartAndClipStart(
      updatedItem.trimStart,
      updatedItem.clipStart,
    );
    clipElm.trimEnd = updatedItem.trimEnd;

    const clipRowIndex = this.#findAvailableRowIndex(updatedItem);

    clipElm.rowIndex = clipRowIndex;
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
