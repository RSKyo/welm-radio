import { assertPlainObject, assertNonBlankString } from "../base/assert.js";
import {
  createElementByHTML,
  isEqualValue,
  filterValue,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { Clip } from "./clip.js";

const CLIP_MIN_DURATION = 5;
const CLIP_HEIGHT = 40;
const SNAP_THRESHOLD = 5;

const ROW_TEMPLATE = `
<div class="clip-row">
  <div class="clip-row-content"></div>
</div>
`;
const CLIP_TEMPLATE = `
<div data-role="clip">
</div>
`;

const rowTemplate = createElementByHTML(ROW_TEMPLATE);
const clipTemplate = createElementByHTML(CLIP_TEMPLATE);

export class ClipGroup extends ItemsElm {
  #trackId = null;
  #selectedClipId = null;
  #duration = 0;

  // ruler
  #timelineRuler = null;
  // playhead
  #timelinePlayhead = null;
  // audio cache
  #audioCache = null;
  // clip component map
  #clipMap = new Map();
  // row elements cache
  #rowElements = [];

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "clip-group",
      valueField: "clipId",
    });

    this.#init();
    this.#bindEvents();
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

    this.setProperty(this.rootElement, "--clip-height", `${CLIP_HEIGHT}px`);
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

  getClips() {
    return Array.from(this.#clipMap.values());
  }

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

  addClip(clip, options = {}) {
    assertPlainObject(clip, "clip");

    const addedClip = this.addItem(clip, options);

    this.#emitClipsChange();

    return addedClip;
  }

  updateClip(clip, options = {}) {
    assertPlainObject(clip, "clip");

    const updatedClip = this.updateItem(clip, options);

    this.#emitClipsChange();

    return updatedClip;
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

    this.#emitClipsChange();

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

    this.updateItem(originalClipItem);
    this.addItem(newClip);

    this.selectedClipId = newClip.clipId;

    this.#emitClipsChange();

    return "success";
  }

  removeClip(clipId = null, { shift = true } = {}) {
    clipId = clipId ?? this.#selectedClipId;

    if (clipId == null) {
      return "clip-not-selected";
    }

    const clipItem = this.getItemByValue(clipId);

    this.removeItem(clipId);

    if (shift) {
      this.shiftClipsForRemove(clipItem);
    }

    this.#emitClipsChange();

    return "success";
  }

  // -----------------------------------------------------------------------------
  // layout
  // -----------------------------------------------------------------------------

  #getMaxRowIndex() {
    let maxRowIndex = -1;

    for (const clipElm of this.#clipMap.values()) {
      maxRowIndex = Math.max(maxRowIndex, clipElm.rowIndex);
    }

    return maxRowIndex;
  }

  #ensureRow(rowIndex) {
    while (this.#rowElements.length <= rowIndex) {
      const newRowIndex = this.#rowElements.length;

      const rowEl = rowTemplate.cloneNode(true);
      rowEl.dataset.rowIndex = newRowIndex;

      this.rootElement.append(rowEl);
      this.#rowElements.push(rowEl);
    }

    return this.#rowElements[rowIndex];
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

  isRowAvailable(clipItem, rowIndex) {
    const clipStart = clipItem.clipStart;
    const clipEnd = clipStart + (clipItem.trimEnd - clipItem.trimStart);

    return this.#isPlacementAvailable(
      clipItem[this.valueField],
      clipStart,
      clipEnd,
      rowIndex,
    );
  }

  findAvailableRowIndex(clipItem) {
    const myRowIndex = clipItem.rowIndex ?? 0;
    if (this.isRowAvailable(clipItem, myRowIndex)) {
      return myRowIndex;
    }

    let rowIndex = 0;
    while (
      rowIndex === myRowIndex ||
      !this.isRowAvailable(clipItem, rowIndex)
    ) {
      rowIndex += 1;
    }

    return rowIndex;
  }

  isInsertPointAvailable(clipStart, rowIndex) {
    for (const clipElm of this.#clipMap.values()) {
      if (clipElm.rowIndex !== rowIndex) {
        continue;
      }

      if (clipStart > clipElm.clipStart && clipStart < clipElm.clipEnd) {
        return false;
      }
    }

    return true;
  }

  resolveTime(localX) {
    return Math.max(0, localX / this.pixelsPerSecond);
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

  shiftClipsForRemove(clipItem) {
    assertPlainObject(clipItem, "clipItem");

    const clipId = clipItem.clipId;
    const clipStart = clipItem.clipStart;
    const rowIndex = clipItem.rowIndex;
    const duration = clipItem.trimEnd - clipItem.trimStart;

    const affectedItems = this.items
      .filter((otherItem) => {
        if (otherItem.clipId === clipId) {
          return false;
        }

        if (otherItem.rowIndex !== rowIndex) {
          return false;
        }

        return otherItem.clipStart > clipStart;
      })
      .sort((a, b) => a.clipStart - b.clipStart);

    for (const otherItem of affectedItems) {
      otherItem.clipStart -= duration;

      // don't use this.updateClip directly, use updateItem instead
      this.updateItem(otherItem, {
        resolveRow: false,
      });
    }
  }

  shiftClipsForInsert(clipItem) {
    assertPlainObject(clipItem, "clipItem");

    const clipId = clipItem.clipId;
    const clipStart = clipItem.clipStart;
    const rowIndex = clipItem.rowIndex;
    const duration = clipItem.trimEnd - clipItem.trimStart;

    const affectedItems = this.items
      .filter((otherItem) => {
        if (otherItem.clipId === clipId) {
          return false;
        }

        if (otherItem.rowIndex !== rowIndex) {
          return false;
        }

        return otherItem.clipStart >= clipStart;
      })
      .sort((a, b) => b.clipStart - a.clipStart);

    for (const otherItem of affectedItems) {
      otherItem.clipStart += duration;

      this.updateItem(otherItem, {
        resolveRow: false,
      });
    }
  }

  normalizeClipEdges(clipItem, mode) {
    const epsilonPixel = 1;
    const epsilonTime = epsilonPixel / this.pixelsPerSecond;

    const clipStart = clipItem.clipStart;
    const clipEnd =
      clipItem.clipStart + (clipItem.trimEnd - clipItem.trimStart);

    for (const otherItem of this.items) {
      if (otherItem.clipId === clipItem.clipId) {
        continue;
      }

      if (otherItem.rowIndex !== clipItem.rowIndex) {
        continue;
      }

      const otherClipStart = otherItem.clipStart;
      const otherClipEnd =
        otherItem.clipStart + (otherItem.trimEnd - otherItem.trimStart);

      if (mode === "move") {
        if (Math.abs(clipStart - otherClipEnd) <= epsilonTime) {
          clipItem.clipStart = otherClipEnd;
          break;
        }

        if (Math.abs(clipEnd - otherClipStart) <= epsilonTime) {
          const duration = clipItem.trimEnd - clipItem.trimStart;
          clipItem.clipStart = otherClipStart - duration;

          break;
        }
      }

      if (mode === "dragging-start") {
        if (Math.abs(clipStart - otherClipEnd) <= epsilonTime) {
          const deltaTime = otherClipEnd - clipStart;
          clipItem.clipStart = otherClipEnd;
          clipItem.trimStart += deltaTime;
          break;
        }
      }

      if (mode === "dragging-end") {
        if (Math.abs(clipEnd - otherClipStart) <= epsilonTime) {
          const deltaTime = otherClipStart - clipEnd;
          clipItem.trimEnd += deltaTime;
          break;
        }
      }
    }

    return clipItem;
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

  onClipsChange(handler) {
    return this.handler.on("clipsChangeHandler", handler);
  }

  #emitClipsChange() {
    this.handler.emit("clipsChangeHandler", {
      elm: this,
      trackId: this.#trackId,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "pointerdown", this.#clipClickHandler, {
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
  createItemElement(item) {
    const clipId = item[this.valueField];
    const clipEl = clipTemplate.cloneNode(true);

    clipEl.dataset.value = clipId;

    const clipElm = new Clip(clipEl, {
      ...item,
      timelineRuler: this.#timelineRuler,
      timelinePlayhead: this.#timelinePlayhead,
      audioCache: this.#audioCache,
    });

    clipElm.onClipEndChange(() => {
      this.#updateClipGroupDuration();
    });

    this.#clipMap.set(clipId, clipElm);

    return clipEl;
  }

  // override
  afterSetItems(items) {
    const selectedClipId = filterValue(this.#selectedClipId, this.itemValues);

    this.#setSelectedClipId(selectedClipId, {
      updateUI: false,
    });

    for (const clipElm of this.#clipMap.values()) {
      clipElm.destroy();
    }

    this.#clipMap.clear();
    this.#rowElements = [];
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
    this.#updateRows();
    this.#updateClipGroupDuration();
    this.#updateSelectedUIState();
  }

  // override
  beforeRenderAddedItem(addedItem, options = {}) {
    if (options.resolveRow !== false) {
      addedItem.rowIndex = this.findAvailableRowIndex(addedItem);
    }

    const rowEl = this.#ensureRow(addedItem.rowIndex);
    const contentEl = rowEl.querySelector(".clip-row-content");

    options.parent = contentEl;
  }

  // override
  afterRenderAddedItem(addedItem) {
    this.#updateRows();
    this.#updateClipGroupDuration();
  }

  renderUpdatedItem(updatedItem, { resolveRow = true } = {}) {
    const value = updatedItem[this.valueField];
    const clipElm = this.#clipMap.get(value);

    if (!clipElm) {
      return;
    }

    if (resolveRow) {
      updatedItem.rowIndex = this.findAvailableRowIndex(updatedItem);
    }

    const rowEl = this.#ensureRow(updatedItem.rowIndex);
    const contentEl = rowEl.querySelector(".clip-row-content");

    contentEl.append(clipElm.rootElement);

    clipElm.update(updatedItem);
  }

  // override
  afterRenderUpdatedItem(updatedItem) {
    this.#updateRows();
    this.#updateClipGroupDuration();
  }

  // override
  afterRenderRemovedItem(removedItem) {
    this.#updateRows();
    this.#updateClipGroupDuration();
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

  #updateSelectedUIState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;
      const selected = this.#selectedClipId === value;
      element.classList.toggle("is-selected", selected);
    });
  }

  #updateRows() {
    const rowCount = Math.max(1, this.#getMaxRowIndex() + 1);

    // ensure required rows
    while (this.#rowElements.length < rowCount) {
      this.#ensureRow(this.#rowElements.length);
    }

    // remove redundant rows
    while (this.#rowElements.length > rowCount) {
      const rowEl = this.#rowElements.pop();
      rowEl.remove();
    }
  }
}
