import {
  assertPositive,
  assertNonNegative,
  assertValueForMode,
} from "../base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  isEqualValue,
  filterValue,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { Clip } from "./clip.js";

const DEFAULT_CLIP_MIN_DURATION = 0.05;
const DEFAULT_CLIP_HEIGHT = 40;
const DEFAULT_CLIP_ROW_GAP = 4;
const DEFAULT_ROW_HEIGHT = DEFAULT_CLIP_HEIGHT + DEFAULT_CLIP_ROW_GAP;
const SNAP_THRESHOLD = 5;

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
    this.resolveOption("pixelsPerSecond", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.#pixelsPerSecond = value;
    });

    this.resolveOption("playheadTime", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);
      this.#playheadTime = value;
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

    const height = (maxRowIndex + 1) * DEFAULT_ROW_HEIGHT + DEFAULT_CLIP_ROW_GAP;
    return Math.max(height, DEFAULT_CLIP_GROUP_MIN_HEIGHT);
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
    const clipEnd = clipStart + (clipItem.trimEnd - clipItem.trimStart);

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

  #resolveRowIndexByY(y) {
    if (y < 0) {
      return null;
    }

    const rowIndex = Math.floor(y / DEFAULT_ROW_HEIGHT);
    const clipTop = rowIndex * DEFAULT_ROW_HEIGHT + DEFAULT_CLIP_ROW_GAP;

    if (y < clipTop) {
      return null;
    }

    return rowIndex;
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
    this.event.on(this.rootElement, "pointerdown", this.#pointerDownHandler, {
      selector: '[data-role="clip"]',
    });

    this.event.on(this.rootElement, "pointermove", this.#pointerMoveHandler);

    this.event.on(this.rootElement, "pointerup", this.#pointerUpHandler);

    this.event.on(
      this.rootElement,
      "pointercancel",
      this.#pointerCancelHandler,
    );
  }

  #pointerDownHandler = (event, { element }) => {
    if (event.button !== 0) {
      return;
    }

    if (this.#draggingPointerId != null) {
      return;
    }

    const value = element.dataset.value;
    const clipElm = this.#clipMap.get(value);
    if (!clipElm) {
      return;
    }

    this.#setSelectedValue(value);

    const clipGroupRect = this.rootElement.getBoundingClientRect();

    const trimStartEl = event.target.closest('[data-role="trim-start"]');
    const trimEndEl = event.target.closest('[data-role="trim-end"]');

    if (trimStartEl) {
      this.#dragMode = "trim-start";
      clipElm.frontTrim = "start";
      this.rootElement.classList.add("is-trimming");
    } else if (trimEndEl) {
      this.#dragMode = "trim-end";
      clipElm.frontTrim = "end";
      this.rootElement.classList.add("is-trimming");
    } else {
      this.#dragMode = "move";
      this.rootElement.classList.add("is-moving");
    }

    this.#draggingClipElm = clipElm;
    this.#draggingElement = element;
    this.#draggingPointerId = event.pointerId;
    this.#dragStartX = event.clientX - clipGroupRect.left;

    this.rootElement.setPointerCapture(event.pointerId);
    event.preventDefault();

    this.#createDraggingGhost();
  };

  #pointerMoveHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    if (event.buttons === 0) {
      this.#commitDragging();
      this.#endDragging(event);
      return;
    }

    const clipElm = this.#draggingClipElm;
    if (!clipElm) {
      return;
    }

    const ghostEl = this.#draggingGhostElement;
    if (!ghostEl) {
      return;
    }

    const dragPosition = this.#getDragPosition(event);

    if (this.#dragMode === "move") {
      const pendingMove = this.#getPendingMove(dragPosition);
      if (!pendingMove) {
        return;
      }

      ghostEl.style.top = `${pendingMove.top}px`;
      ghostEl.style.left = `${pendingMove.left}px`;

      this.#pendingMove = pendingMove;

      return;
    }

    if (this.#dragMode === "trim-start" || this.#dragMode === "trim-end") {
      const pendingTrim = this.#getPendingTrim(dragPosition);
      if (!pendingTrim) {
        return;
      }

      ghostEl.style.left = `${pendingTrim.left}px`;
      ghostEl.style.width = `${pendingTrim.width}px`;

      this.#pendingTrim = pendingTrim;

      return;
    }
  };

  #pointerUpHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    this.#commitDragging();
    this.#endDragging(event);
  };

  #commitDragging() {
    const clipElm = this.#draggingClipElm;
    if (!clipElm) {
      return;
    }

    if (this.#dragMode === "move") {
      const pendingMove = this.#pendingMove;
      if (pendingMove == null) {
        return;
      }

      const { rowIndex: newRowIndex, left: newLeft } = pendingMove;

      const newClipStart = Number((newLeft / this.#pixelsPerSecond).toFixed(3));

      const newClipEnd = newClipStart + clipElm.duration;

      if (
        !this.#isPlacementAvailable(
          clipElm.clipId,
          newClipStart,
          newClipEnd,
          newRowIndex,
        )
      ) {
        return;
      }

      clipElm.rowIndex = newRowIndex;
      clipElm.clipStart = newClipStart;

      return;
    }

    if (this.#dragMode === "trim-start") {
      const pendingTrim = this.#pendingTrim;
      if (pendingTrim == null) {
        return;
      }

      const { left } = pendingTrim;

      const deltaX = left - clipElm.left;
      const deltaTime = deltaX / this.#pixelsPerSecond;

      const newTrimStart = Number((clipElm.trimStart + deltaTime).toFixed(3));

      clipElm.trimStart = newTrimStart;

      return;
    }

    if (this.#dragMode === "trim-end") {
      const pendingTrim = this.#pendingTrim;
      if (pendingTrim == null) {
        return;
      }

      const { width } = pendingTrim;

      const deltaX = width - clipElm.width;
      const deltaTime = deltaX / this.#pixelsPerSecond;

      const newTrimEnd = Number((clipElm.trimEnd + deltaTime).toFixed(3));

      clipElm.trimEnd = newTrimEnd;
    }
  }

  #createDraggingGhost() {
    const element = this.#draggingElement;
    const clipElm = this.#draggingClipElm;

    if (!element || !clipElm) {
      return;
    }

    this.#draggingGhostElement?.remove();
    this.#draggingGhostElement = null;

    const ghostEl = element.cloneNode(true);

    ghostEl.classList.add("is-drag-ghost");

    ghostEl.style.left = `${clipElm.left}px`;
    ghostEl.style.top = `${clipElm.top}px`;
    ghostEl.style.width = `${clipElm.width}px`;

    this.rootElement.appendChild(ghostEl);

    this.#draggingGhostElement = ghostEl;
  }

  #getDragPosition(event) {
    const rect = this.rootElement.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return {
      x,
      y,
      deltaX: x - this.#dragStartX,
    };
  }

  #getPendingMove(dragPosition) {
    const clipElm = this.#draggingClipElm;

    const { y, deltaX } = dragPosition;

    const newRowIndex = this.#resolveRowIndexByY(y);
    if (newRowIndex == null) {
      return null;
    }

    const newTop = newRowIndex * DEFAULT_ROW_HEIGHT + DEFAULT_CLIP_ROW_GAP;

    let newLeft = clipElm.left + deltaX;
    const newEndLeft = newLeft + clipElm.width;

    let snapLeft = null;
    let snapDistance = SNAP_THRESHOLD;

    const trySnap = (left, distance) => {
      if (distance < snapDistance) {
        snapLeft = left;
        snapDistance = distance;
      }
    };

    // snap to playhead position
    const playheadLeft = this.#playheadTime * this.#pixelsPerSecond;
    trySnap(playheadLeft, Math.abs(newLeft - playheadLeft));
    trySnap(playheadLeft - clipElm.width, Math.abs(newEndLeft - playheadLeft));

    // snap to other clips
    for (const otherClipElm of this.#clipMap.values()) {
      const isSameRow = newRowIndex === otherClipElm.rowIndex;

      if (isSameRow) {
        if (otherClipElm === clipElm) {
          continue;
        }

        // left edge -> previous clip right edge
        if (newLeft >= otherClipElm.endLeft) {
          trySnap(otherClipElm.endLeft, newLeft - otherClipElm.endLeft);
        }

        // right edge -> next clip left edge
        if (newEndLeft <= otherClipElm.left) {
          trySnap(
            otherClipElm.left - clipElm.width,
            otherClipElm.left - newEndLeft,
          );
        }

        continue;
      }

      // left edge -> left edge
      trySnap(otherClipElm.left, Math.abs(newLeft - otherClipElm.left));

      // left edge -> right edge
      trySnap(otherClipElm.endLeft, Math.abs(newLeft - otherClipElm.endLeft));

      // right edge -> left edge
      trySnap(
        otherClipElm.left - clipElm.width,
        Math.abs(newEndLeft - otherClipElm.left),
      );

      // right edge -> right edge
      trySnap(
        otherClipElm.endLeft - clipElm.width,
        Math.abs(newEndLeft - otherClipElm.endLeft),
      );
    }

    if (snapLeft != null) {
      newLeft = snapLeft;
    }

    newLeft = Math.max(0, newLeft);

    return {
      rowIndex: newRowIndex,
      left: newLeft,
      top: newTop,
    };
  }

  #getPendingTrim(dragPosition) {
    const clipElm = this.#draggingClipElm;

    const { deltaX } = dragPosition;

    let snapLeft = null;
    let snapDistance = SNAP_THRESHOLD;

    const trySnap = (left, distance) => {
      if (distance < snapDistance) {
        snapLeft = left;
        snapDistance = distance;
      }
    };

    const playheadLeft = this.#playheadTime * this.#pixelsPerSecond;

    if (this.#dragMode === "trim-start") {
      let newDraggingLeft = clipElm.left + deltaX;

      const audioStartLeft =
        clipElm.left -
        (clipElm.trimStart - clipElm.audioStart) * this.#pixelsPerSecond;

      const { previousClipElm } = this.#getAdjacentClipElms(clipElm);
      const prevClipEndLeft = previousClipElm?.endLeft ?? 0;

      const minAllowedLeft = Math.max(audioStartLeft, prevClipEndLeft);

      const minWidth = DEFAULT_CLIP_MIN_DURATION * this.#pixelsPerSecond;
      const maxAllowedLeft = clipElm.endLeft - minWidth;

      if (previousClipElm) {
        trySnap(
          previousClipElm.endLeft,
          Math.abs(newDraggingLeft - previousClipElm.endLeft),
        );
      }

      if (playheadLeft >= minAllowedLeft && playheadLeft <= maxAllowedLeft) {
        trySnap(playheadLeft, Math.abs(newDraggingLeft - playheadLeft));
      }

      if (snapLeft != null) {
        newDraggingLeft = snapLeft;
      }

      const newLeft = Math.min(
        Math.max(newDraggingLeft, minAllowedLeft),
        maxAllowedLeft,
      );

      const newWidth = clipElm.width - (newLeft - clipElm.left);

      return {
        left: newLeft,
        width: newWidth,
      };
    }

    if (this.#dragMode === "trim-end") {
      let newDraggingEndLeft = clipElm.endLeft + deltaX;

      const audioEndLeft =
        clipElm.endLeft +
        (clipElm.audioEnd - clipElm.trimEnd) * this.#pixelsPerSecond;

      const { nextClipElm } = this.#getAdjacentClipElms(clipElm);
      const nextClipLeft = nextClipElm?.left ?? audioEndLeft;

      const maxAllowedLeft = Math.min(audioEndLeft, nextClipLeft);

      const minWidth = DEFAULT_CLIP_MIN_DURATION * this.#pixelsPerSecond;
      const minAllowedLeft = clipElm.left + minWidth;

      if (nextClipElm) {
        trySnap(
          nextClipElm.left,
          Math.abs(newDraggingEndLeft - nextClipElm.left),
        );
      }

      if (playheadLeft >= minAllowedLeft && playheadLeft <= maxAllowedLeft) {
        trySnap(playheadLeft, Math.abs(newDraggingEndLeft - playheadLeft));
      }

      if (snapLeft != null) {
        newDraggingEndLeft = snapLeft;
      }

      const newEndLeft = Math.min(
        Math.max(newDraggingEndLeft, minAllowedLeft),
        maxAllowedLeft,
      );

      const newWidth = newEndLeft - clipElm.left;

      return {
        left: clipElm.left,
        width: newWidth,
      };
    }

    return null;
  }

  #getAdjacentClipElms(clipElm) {
    let previousClipElm = null;
    let nextClipElm = null;

    for (const otherClipElm of this.#clipMap.values()) {
      if (otherClipElm === clipElm) {
        continue;
      }

      if (otherClipElm.rowIndex !== clipElm.rowIndex) {
        continue;
      }

      if (otherClipElm.clipEnd <= clipElm.clipStart) {
        if (
          previousClipElm == null ||
          otherClipElm.clipEnd > previousClipElm.clipEnd
        ) {
          previousClipElm = otherClipElm;
        }

        continue;
      }

      if (otherClipElm.clipStart >= clipElm.clipEnd) {
        if (
          nextClipElm == null ||
          otherClipElm.clipStart < nextClipElm.clipStart
        ) {
          nextClipElm = otherClipElm;
        }
      }
    }

    return {
      previousClipElm,
      nextClipElm,
    };
  }

  #endDragging(event) {
    const pointerId = this.#draggingPointerId;

    this.rootElement.classList.remove("is-moving", "is-trimming");

    this.#dragMode = null;
    this.#draggingClipElm = null;
    this.#draggingElement = null;
    this.#draggingPointerId = null;

    this.#pendingMove = null;
    this.#pendingTrim = null;

    this.#draggingGhostElement?.remove();
    this.#draggingGhostElement = null;

    this.#dragStartX = 0;

    if (
      pointerId === event.pointerId &&
      this.rootElement.hasPointerCapture(event.pointerId)
    ) {
      this.rootElement.releasePointerCapture(event.pointerId);
    }
  }

  #pointerCancelHandler = (event) => {
    if (!this.#draggingClipElm) {
      return;
    }

    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    this.#endDragging(event);
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

    const clipOptions = {
      ...item,
      pixelsPerSecond: this.#pixelsPerSecond,
      height: DEFAULT_CLIP_HEIGHT,
      rowGap: DEFAULT_CLIP_ROW_GAP,
    };

    const clipRowIndex = this.#findAvailableRowIndex(clipOptions);
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
