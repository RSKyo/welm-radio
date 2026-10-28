import { assertPlainObject, assertNonBlankString } from "../base/assert.js";
import {
  createElementByHTML,
  isEqualValue,
  filterValue,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { Clip } from "./clip.js";

const CLIP_MIN_DURATION = 4;
const CLIP_HEIGHT = 40;
const CLIP_ROW_GAP = 3;
const CLIP_ROW_HEIGHT = CLIP_HEIGHT + CLIP_ROW_GAP;
const SNAP_THRESHOLD = 5;

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
  #trackId = null;
  #selectedClipId = null;
  #duration = 0;
  #height = 0;

  // ruler
  #timelineRuler = null;
  // playhead
  #timelinePlayhead = null;
  // audio cache
  #audioCache = null;
  // clip component map
  #clipMap = new Map();

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "clip-group",
      valueField: "clipId",
    });

    this.#init();
    this.#bindEvents();
    this.#updateClipGroupHeight();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.applyRequiredOption("trackId", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#trackId = value;
    });

    this.applyRequiredOption("timelineRuler", (value) => {
      this.#timelineRuler = value;
    });

    this.applyRequiredOption("timelinePlayhead", (value, assertionSubject) => {
      this.#timelinePlayhead = value;
    });

    this.applyOption("audioCache", (value, assertionSubject) => {
      this.#audioCache = value;
    });

    this.rootElement.style.setProperty(
      "--clip-row-height",
      `${CLIP_ROW_HEIGHT}px`,
    );

    this.rootElement.style.setProperty("--clip-row-gap", `${CLIP_ROW_GAP}px`);

    // this.setItems(null);
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get trackId() {
    return this.#trackId;
  }

  get pixelsPerSecond() {
    return this.#timelineRuler.pixelsPerSecond;
  }

  get duration() {
    return this.#duration;
  }

  #setDuration(value) {
    if (value === this.#duration) {
      return;
    }

    this.#duration = value;

    this.#emitDurationChange();
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
    this.#emitHeightChange();
  }

  get snapThreshold() {
    return SNAP_THRESHOLD;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  /** selected trackId (read-write) */

  get selectedClipId() {
    return this.#selectedClipId;
  }

  set selectedClipId(clipId) {
    assertNonBlankString(clipId, "selectedClipId");
    this.#setSelectedClipId(clipId);
  }

  #setSelectedClipId(clipId, { updateUI = true, emitEvent = true } = {}) {
    if (isEqualValue(clipId, this.#selectedClipId)) {
      return;
    }

    this.#selectedClipId = clipId;

    if (updateUI) {
      this.#updateSelectedUIState();
    }

    if (emitEvent) {
      this.#emitSelectedChange();
    }
  }

  // -----------------------------------------------------------------------------
  // queries / access
  // -----------------------------------------------------------------------------

  getClip(clipId) {
    assertNonBlankString(clipId, "clipId");
    return this.#clipMap.get(clipId) ?? null;
  }

  getSelectedClip() {
    if (this.#selectedClipId == null) {
      return null;
    }
    return this.#clipMap.get(this.#selectedClipId) ?? null;
  }

  getSnapPoints() {
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

  // ---------------------------------------------------------------------------
  // clip operations
  // ---------------------------------------------------------------------------

  unselect() {
    this.#setSelectedClipId(null, { emitEvent: false });
  }

  addClip(clip) {
    assertPlainObject(clip, "clip");
    this.addItem(clip);
  }

  duplicateClip() {
    const clipElm = this.getSelectedClip();
    if (clipElm == null) {
      return "clip-not-selected";
    }

    const originalClipItem = this.getItemByValue(clipElm.clipId);
    const newClip = {
      ...originalClipItem,
      clipId: crypto.randomUUID(),
      clipStart: clipElm.clipEnd,
    };

    this.addItem(newClip);
    this.selectedClipId = newClip.clipId;

    return "success";
  }

  splitClip() {
    const clipElm = this.getSelectedClip();
    if (clipElm == null) {
      return "clip-not-selected";
    }

    const splitTime = this.#timelinePlayhead.time;

    if (splitTime <= clipElm.clipStart + CLIP_MIN_DURATION) {
      return "too-close-to-start";
    }

    if (splitTime >= clipElm.clipEnd - CLIP_MIN_DURATION) {
      return "too-close-to-end";
    }

    const originalClipItem = this.getItemByValue(clipElm.clipId);

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

    this.selectedClipId = newClip.clipId;

    return "success";
  }

  removeClip() {
    const clipElm = this.getSelectedClip();
    if (clipElm == null) {
      return "clip-not-selected";
    }

    this.removeItem(clipElm.clipId);

    return "success";
  }

  // -----------------------------------------------------------------------------
  // layout
  // -----------------------------------------------------------------------------

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
    const offsetTop = CLIP_ROW_GAP === 0 ? 0 : 1 + (CLIP_ROW_GAP - 1) / 2;
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

  getClipTrimTimeRange(clipId, edge) {
    const clipElm = this.getClip(clipId);

    let prevClipEnd = 0;
    let nextClipStart = Infinity;

    for (const otherClipElm of this.#clipMap.values()) {
      if (otherClipElm.clipId === clipId) {
        continue;
      }

      if (otherClipElm.rowIndex !== clipElm.rowIndex) {
        continue;
      }

      if (otherClipElm.clipEnd <= clipElm.clipStart) {
        prevClipEnd = Math.max(prevClipEnd, otherClipElm.clipEnd);
      }

      if (otherClipElm.clipStart >= clipElm.clipEnd) {
        nextClipStart = Math.min(nextClipStart, otherClipElm.clipStart);
      }
    }

    if (edge === "start") {
      const minClipStart =
        clipElm.clipStart - (clipElm.trimStart - clipElm.audioStart);

      return {
        minTime: Math.max(0, minClipStart, prevClipEnd),
        maxTime: clipElm.clipEnd - CLIP_MIN_DURATION,
      };
    }

    if (edge === "end") {
      const maxClipEnd = clipElm.clipEnd + (clipElm.audioEnd - clipElm.trimEnd);

      return {
        minTime: clipElm.clipStart + CLIP_MIN_DURATION,
        maxTime: Math.min(maxClipEnd, nextClipStart),
      };
    }

    throw new Error(`Unknown trim edge: ${edge}`);
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  onSelectedChange(handler) {
    return this.handler.on("selectedChangeHandler", handler);
  }

  #emitSelectedChange() {
    this.handler.emit("selectedChangeHandler", {
      elm: this,
      trackId: this.#trackId,
      clipId: this.#selectedClipId,
    });
  }

  onDurationChange(handler) {
    return this.handler.on("durationChangeHandler", handler);
  }

  #emitDurationChange() {
    this.handler.emit("durationChangeHandler", {
      elm: this,
      duration: this.#duration,
    });
  }

  onHeightChange(handler) {
    return this.handler.on("heightChangeHandler", handler);
  }

  #emitHeightChange() {
    this.handler.emit("heightChangeHandler", {
      elm: this,
      height: this.#height,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "click", this.#clipClickHandler, {
      selector: '[data-role="clip"]',
    });
  }

  #clipClickHandler = (event, { element }) => {
    const clipId = element.dataset.value;
    this.#setSelectedClipId(clipId);
  };

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  createEmptyElement() {
    return emptyTemplate.cloneNode(true);
  }

  // override
  createItemElement(item) {
    const clipId = item[this.valueField];
    const clipEl = clipTemplate.cloneNode(true);
    clipEl.dataset.value = clipId;

    const clipOptions = {
      ...item,
      timelineRuler: this.#timelineRuler,
      timelinePlayhead: this.#timelinePlayhead,
      height: CLIP_HEIGHT,
      rowGap: CLIP_ROW_GAP,
      audioCache: this.#audioCache,
    };

    const clipRowIndex = this.#findAvailableRowIndex(clipOptions);
    item.rowIndex = clipRowIndex;

    clipOptions.rowIndex = clipRowIndex;

    const clipElm = new Clip(clipEl, clipOptions);

    clipElm.onClipEndChange(() => {
      this.#updateClipGroupDuration();
    });

    clipElm.onRowIndexChange(() => {
      this.#updateClipGroupHeight();
    });

    this.#clipMap.set(clipId, clipElm);

    return clipEl;
  }

  // override
  afterSetItems(items) {
    const selectedClipId = filterValue(this.#selectedClipId, this.itemValues);
    this.#setSelectedClipId(selectedClipId, { updateUI: false });

    // clear all clipElm
    for (const clipElm of this.#clipMap.values()) {
      clipElm.destroy();
    }
    this.#clipMap.clear();
  }

  // do nothing for afterAddItem
  // afterAddItem(addedItem) {}

  // do nothing for afterUpdateItem
  // afterUpdateItem(updatedItem) {}

  // override
  afterRemoveItem(removedItem) {
    const selectedClipId = filterValue(this.#selectedClipId, this.itemValues);
    this.#setSelectedClipId(selectedClipId, { updateUI: false });

    const clipId = removedItem[this.valueField];

    const clipMap = this.#clipMap;
    const clipElm = clipMap.get(clipId);
    clipElm.destroy();
    clipMap.delete(clipId);
  }

  // override
  afterRenderItems(items) {
    this.#updateClipGroupHeight();
    this.#updateClipGroupDuration();
    this.#updateSelectedUIState();
  }

  // override
  afterRenderItem(addedItem) {
    this.#updateClipGroupDuration();
    this.#updateClipGroupHeight();
  }

  renderUpdatedItem(updatedItem, assertionSubject = "item") {
    const value = updatedItem[this.valueField];
    const clipElm = this.#clipMap.get(value);

    if (!clipElm) {
      return;
    }

    const clipRowIndex = this.#findAvailableRowIndex(updatedItem);
    updatedItem.rowIndex = clipRowIndex;

    clipElm.update(updatedItem);
  }

  // override
  afterRenderUpdatedItem(updatedItem) {
    this.#updateClipGroupDuration();
    this.#updateClipGroupHeight();
  }

  // override
  afterRenderRemovedItem(removedItem) {
    this.#updateClipGroupDuration();
    this.#updateClipGroupHeight();
  }

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateClipGroupDuration() {
    let maxClipEnd = 0;

    for (const clipElm of this.#clipMap.values()) {
      maxClipEnd = Math.max(maxClipEnd, clipElm.clipEnd);
    }

    this.#setDuration(maxClipEnd);
  }

  #updateClipGroupHeight() {
    let maxRowIndex = 0;

    for (const clipElm of this.#clipMap.values()) {
      maxRowIndex = Math.max(maxRowIndex, clipElm.rowIndex);
    }

    this.#setHeight((maxRowIndex + 1) * CLIP_ROW_HEIGHT);
  }

  #updateSelectedUIState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;
      const selected = this.#selectedClipId === value;
      element.classList.toggle("is-selected", selected);
    });
  }

  #updateHeightUIState() {
    this.rootElement.style.height = `${this.#height}px`;
  }
}
