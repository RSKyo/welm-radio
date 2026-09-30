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
  // clip component map
  #clipMap = new Map();
  // dragging
  #draggingClipElm = null;
  #draggingElement = null;
  #draggingPointerId = null;
  #draggingGhostElement = null;
  #dragStartX = 0;

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

    const rowHeight = DEFAULT_CLIP_HEIGHT + DEFAULT_CLIP_ROW_GAP;
    const rowIndex = Math.floor(y / rowHeight);
    const clipTop = rowIndex * rowHeight + DEFAULT_CLIP_ROW_GAP;

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
    this.event.on(this.rootElement, "click", this.#itemClickHandler, {
      selector: '[data-role="clip"]',
    });

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

  #pointerDownHandler = (event, { element }) => {
    if (event.button !== 0) {
      return;
    }

    const value = element.dataset.value;
    const clipElm = this.#clipMap.get(value);

    if (!clipElm) {
      return;
    }

    const groupRect = this.rootElement.getBoundingClientRect();

    this.#draggingClipElm = clipElm;
    this.#draggingElement = element;
    this.#draggingPointerId = event.pointerId;

    this.#dragStartX = event.clientX - groupRect.left;

    element.setPointerCapture(event.pointerId);

    event.preventDefault();

    this.#createDraggingGhost();
  };

  #pointerMoveHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
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

    const { newLeft, newRowIndex } = this.#getNewPosition(event);
    if (newRowIndex == null) {
      return;
    }

    const rowHeight = DEFAULT_CLIP_HEIGHT + DEFAULT_CLIP_ROW_GAP;
    const top = newRowIndex * rowHeight + DEFAULT_CLIP_ROW_GAP;

    ghostEl.style.top = `${top}px`;
    ghostEl.style.left = `${newLeft}px`;
  };

  #pointerUpHandler = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    const clipElm = this.#draggingClipElm;
    if (!clipElm) {
      return;
    }

    const { newLeft, newRowIndex } = this.#getNewPosition(event);
    if (newRowIndex == null) {
      this.#endDragging(event);
      return;
    }

    const newClipStart = clipElm.xToClipStart(newLeft);
    const newClipEnd = newClipStart + clipElm.duration;

    if (
      !this.#isPlacementAvailable(
        clipElm.clipId,
        newClipStart,
        newClipEnd,
        newRowIndex,
      )
    ) {
      this.#endDragging(event);
      return;
    }

    clipElm.rowIndex = newRowIndex;
    clipElm.clipStart = newClipStart;

    this.#endDragging(event);
  };

  #getNewPosition(event) {
    const clipElm = this.#draggingClipElm;
    const oldLeft = clipElm.left;

    const groupRect = this.rootElement.getBoundingClientRect();
    const x = event.clientX - groupRect.left;
    const y = event.clientY - groupRect.top;

    const deltaX = x - this.#dragStartX;

    const newRowIndex = this.#resolveRowIndexByY(y);

    if (newRowIndex == null) {
      return {
        newRowIndex: null,
        newLeft: oldLeft,
      };
    }

    let newLeft = oldLeft + deltaX;
    const newEndLeft = newLeft + clipElm.width;

    let snapLeft = null;
    let snapDistance = SNAP_THRESHOLD;

    const trySnap = (left, distance) => {
      if (distance < snapDistance) {
        snapLeft = left;
        snapDistance = distance;
      }
    };

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
      newRowIndex,
      newLeft,
    };
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

  #endDragging(event) {
    const element = this.#draggingElement;

    if (
      element &&
      this.#draggingPointerId === event.pointerId &&
      element.hasPointerCapture(event.pointerId)
    ) {
      element.releasePointerCapture(event.pointerId);
    }

    this.#draggingClipElm = null;
    this.#draggingElement = null;
    this.#draggingPointerId = null;
    this.#draggingGhostElement?.remove();
    this.#draggingGhostElement = null;

    this.#dragStartX = 0;
  }

  #createDraggingGhost() {
    const element = this.#draggingElement;
    const clipElm = this.#draggingClipElm;

    if (!element || !clipElm) {
      return;
    }

    const ghostEl = element.cloneNode(true);

    ghostEl.classList.add("is-drag-ghost");

    ghostEl.style.left = `${clipElm.left}px`;
    ghostEl.style.top = `${clipElm.top}px`;
    ghostEl.style.width = `${clipElm.width}px`;

    this.rootElement.appendChild(ghostEl);

    this.#draggingGhostElement = ghostEl;
  }

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
