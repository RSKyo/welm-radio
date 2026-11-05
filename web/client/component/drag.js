import { assertHtmlElement, assertNonBlankString } from "./base/assert.js";
import { resolveElement, closestElement, toLocalPoint } from "./base/helper.js";
import { ElmHandler } from "./base/elm-handler.js";

const DRAGGING_START_SELECTOR = "[data-role='dragging-start']";
const DRAGGING_END_SELECTOR = "[data-role='dragging-end']";

export class DragDelegate {
  #handler = new ElmHandler();

  #draggingSelector = null;
  #targetSelector = null;
  #ignoreDraggingSelector = null;

  #pointerId = null;

  #state = new Map();
  #initClientX = null;
  #initClientY = null;

  #mode = null;
  #moveMode = null;

  #delegateEl = null;
  #draggingEl = null;
  #draggingGhostEl = null;
  #draggingGhostInfo = null;
  #insertGhostEl = null;
  #insertGhostInfo = null;
  #targetEl = null;

  #lastClientX = null;
  #direction = null;

  constructor(
    delegater,
    draggingSelector,
    targetSelector,
    { ignoreDraggingSelector = null } = {},
  ) {
    this.#delegateEl = resolveElement(delegater);
    assertHtmlElement(this.#delegateEl);

    assertNonBlankString(draggingSelector);
    assertNonBlankString(targetSelector);

    this.#draggingSelector = draggingSelector;
    this.#targetSelector = targetSelector;

    if (ignoreDraggingSelector !== null) {
      assertNonBlankString(ignoreDraggingSelector, "ignoreDraggingSelector");
      this.#ignoreDraggingSelector = ignoreDraggingSelector;
    }

    this.#delegateEl.addEventListener("pointerdown", this.#pointerDown);
    window.addEventListener("pointermove", this.#pointerMove);
    window.addEventListener("pointerup", this.#pointerUp);
    window.addEventListener("pointercancel", this.#pointerCancel);
  }

  // -----------------------------------------------------------------------------
  // state access
  // -----------------------------------------------------------------------------

  getState(key) {
    return this.#state.get(key);
  }

  setState(key, value) {
    this.#state.set(key, value);
  }

  get mode() {
    return this.#mode;
  }

  get moveMode() {
    return this.#moveMode;
  }

  get delegateEl() {
    return this.#delegateEl;
  }

  get draggingEl() {
    return this.#draggingEl;
  }

  get draggingGhostEl() {
    return this.#draggingGhostEl;
  }

  get draggingGhostInfo() {
    if (this.#draggingGhostInfo == null) {
      return null;
    }

    return { ...this.#draggingGhostInfo };
  }

  get insertGhostEl() {
    return this.#insertGhostEl;
  }

  get insertGhostInfo() {
    if (this.#insertGhostInfo == null) {
      return null;
    }

    return { ...this.#insertGhostInfo };
  }

  get targetEl() {
    return this.#targetEl;
  }

  get hasTarget() {
    return this.#targetEl != null;
  }

  get isDragging() {
    return this.#draggingGhostEl != null;
  }

  get direction() {
    return this.#direction;
  }

  // -----------------------------------------------------------------------------
  // pointer down
  // -----------------------------------------------------------------------------

  #pointerDown = (event) => {
    if (this.#pointerId != null) {
      return;
    }

    // 0: left, 1: middle, 2: right
    if (event.button !== 0) {
      return;
    }

    if (
      this.#ignoreDraggingSelector &&
      closestElement(event, this.#ignoreDraggingSelector)
    ) {
      return;
    }

    const draggingEl = closestElement(event, this.#draggingSelector);
    if (draggingEl == null) {
      return;
    }

    // dragging mode

    const startEl = closestElement(event, DRAGGING_START_SELECTOR);
    if (startEl && !draggingEl.contains(startEl)) {
      return;
    }

    const endEl = closestElement(event, DRAGGING_END_SELECTOR);
    if (endEl && !draggingEl.contains(endEl)) {
      return;
    }

    this.#mode = "move";
    if (startEl) {
      this.#mode = "dragging-start";
    } else if (endEl) {
      this.#mode = "dragging-end";
    }

    const clientX = event.clientX;
    const clientY = event.clientY;

    this.#lastClientX = clientX;
    this.#direction = null;

    this.#initClientX = clientX;
    this.#initClientY = clientY;

    this.#draggingEl = draggingEl;

    const element = document.elementFromPoint(clientX, clientY);
    const targetEl = element?.closest(this.#targetSelector) ?? null;
    this.#targetEl = targetEl;

    if (this.#mode === "dragging-start" || this.#mode === "dragging-end") {
      if (this.#targetEl == null) {
        throw new Error(
          `Failed to find target element by ${this.#targetSelector}`,
        );
      }
    }

    this.#pointerId = event.pointerId;
    event.preventDefault();

    this.#emitPointerDown(event);
  };

  // -----------------------------------------------------------------------------
  // pointer move
  // -----------------------------------------------------------------------------

  #pointerMove = (event) => {
    if (event.pointerId !== this.#pointerId) {
      return;
    }

    const initClientX = this.#initClientX;
    const initClientY = this.#initClientY;
    const clientX = event.clientX;
    const clientY = event.clientY;

    // direction
    const lastDeltaX = event.clientX - this.#lastClientX;
    if (lastDeltaX < 0) {
      this.#direction = "left";
    } else if (lastDeltaX > 0) {
      this.#direction = "right";
    }
    this.#lastClientX = event.clientX;

    // dragging ghost
    if (this.#draggingGhostEl == null) {
      const deltaX = clientX - initClientX;
      const deltaY = clientY - initClientY;

      if (Math.hypot(deltaX, deltaY) >= 3) {
        this.#createDraggingGhost();

        if (this.#mode === "move") {
          this.#createInsertGhost();
        }
      }
    }

    const draggingGhostEl = this.#draggingGhostEl;
    if (draggingGhostEl) {
      const draggingGhostInfo = this.#draggingGhostInfo;
      const mode = this.#mode;

      if (mode == "move") {
        this.#moveMode = event.metaKey || event.ctrlKey ? "insert" : "normal";

        const element = document.elementFromPoint(clientX, clientY);
        const targetEl = element?.closest(this.#targetSelector) ?? null;
        this.#targetEl = targetEl;

        const ghostContainerEl = targetEl ?? document.body;

        if (draggingGhostEl.parentElement !== ghostContainerEl) {
          ghostContainerEl.append(draggingGhostEl);
        }

        if (this.#insertGhostEl.parentElement !== ghostContainerEl) {
          ghostContainerEl.append(this.#insertGhostEl);
        }

        const { localX, localY } = toLocalPoint(
          clientX,
          clientY,
          ghostContainerEl,
        );

        this.#draggingGhostInfo.localX = localX;
        this.#draggingGhostInfo.localY = localY;
        this.#insertGhostInfo.localX = localX;
        this.#insertGhostInfo.localY = localY;

        if (this.#moveMode === "normal") {
          const x1 = localX - draggingGhostInfo.offsetLeft;
          const y1 = localY - draggingGhostInfo.offsetTop;
          this.#dragTo(x1, y1);
        } else if (this.#moveMode === "insert") {
          const x1 = localX - this.#insertGhostInfo.offsetLeft;
          const y1 = localY - this.#insertGhostInfo.offsetTop;
          this.#insertTo(x1, y1);
        }

        if (this.#moveMode === "normal") {
          this.#draggingGhostEl.hidden = false;
          this.#insertGhostEl.hidden = true;
        } else {
          this.#draggingGhostEl.hidden = true;
          this.#insertGhostEl.hidden = false;
        }
      } else if (mode == "dragging-start") {
        const { localX } = toLocalPoint(clientX, clientY, this.#targetEl);
        const x1 = localX - draggingGhostInfo.offsetLeft;
        this.#dragStartTo(x1);
      } else if (mode == "dragging-end") {
        const { localX } = toLocalPoint(clientX, clientY, this.#targetEl);
        const x2 = localX + draggingGhostInfo.offsetRight;
        this.#dragEndTo(x2);
      }
    }

    this.#emitPointerMove(event);
  };

  // -----------------------------------------------------------------------------
  // pointer up
  // -----------------------------------------------------------------------------

  #pointerUp = (event) => {
    if (event.pointerId !== this.#pointerId) {
      return;
    }

    try {
      this.#emitPointerUp(event);
    } finally {
      this.#endDragging();
    }
  };

  #pointerCancel = (event) => {
    if (event.pointerId !== this.#pointerId) {
      return;
    }

    try {
      this.#emitPointerCancel(event);
    } finally {
      this.#endDragging();
    }
  };

  #endDragging() {
    this.#draggingGhostEl?.remove();
    this.#insertGhostEl?.remove();

    this.#pointerId = null;
    this.#initClientX = null;
    this.#initClientY = null;
    this.#mode = null;
    this.#moveMode = null;

    this.#draggingEl = null;
    this.#draggingGhostEl = null;
    this.#draggingGhostInfo = null;
    this.#insertGhostEl = null;
    this.#insertGhostInfo = null;
    this.#targetEl = null;

    this.#lastClientX = null;
    this.#direction = null;

    this.#state.clear();
  }

  #createDraggingGhost() {
    if (this.#draggingEl == null) {
      return null;
    }

    const draggingEl = this.#draggingEl;
    const draggingGhostEl = draggingEl.cloneNode(true);

    if (this.#mode === "dragging-start") {
      draggingGhostEl.classList.add("is-dragging-start");
    } else if (this.#mode === "dragging-end") {
      draggingGhostEl.classList.add("is-dragging-end");
    }

    draggingGhostEl.classList.add("is-drag-ghost");

    draggingGhostEl.style.visibility = "hidden";

    const ghostContainerEl = this.#targetEl ?? document.body;
    ghostContainerEl.appendChild(draggingGhostEl);

    const initClientX = this.#initClientX;
    const initClientY = this.#initClientY;

    const { localX, localY } = toLocalPoint(
      initClientX,
      initClientY,
      ghostContainerEl,
    );

    const draggingRect = draggingEl.getBoundingClientRect();
    const localPointInDragging = toLocalPoint(
      initClientX,
      initClientY,
      draggingEl,
      draggingRect,
    );

    const ratioX = localPointInDragging.bounds.left / draggingRect.width;
    const ratioY = localPointInDragging.bounds.top / draggingRect.height;

    const ghostRect = draggingGhostEl.getBoundingClientRect();
    const offsetLeft = ghostRect.width * ratioX;
    const offsetTop = ghostRect.height * ratioY;

    const width = ghostRect.width;
    const height = ghostRect.height;
    const x1 = localX - offsetLeft;
    const y1 = localY - offsetTop;
    const x2 = x1 + width;
    const y2 = y1 + height;

    draggingGhostEl.style.left = `${x1}px`;
    draggingGhostEl.style.top = `${y1}px`;
    draggingGhostEl.style.visibility = "";

    const { bounds } = toLocalPoint(initClientX, initClientY, draggingGhostEl);
    this.#draggingGhostInfo = {
      localX,
      localY,
      width,
      height,
      x1,
      y1,
      x2,
      y2,
      offsetLeft: bounds.left,
      offsetTop: bounds.top,
      offsetRight: bounds.right,
      offsetBottom: bounds.bottom,
    };

    this.#draggingGhostEl = draggingGhostEl;
  }

  #createInsertGhost() {
    const draggingEl = this.#draggingEl;
    const draggingRect = draggingEl.getBoundingClientRect();

    const insertGhostEl = document.createElement("div");
    insertGhostEl.classList.add("is-insert-ghost");
    insertGhostEl.hidden = true;

    const ghostContainerEl = this.#targetEl ?? document.body;
    ghostContainerEl.appendChild(insertGhostEl);

    const initClientX = this.#initClientX;
    const initClientY = this.#initClientY;

    const { localX, localY } = toLocalPoint(
      initClientX,
      initClientY,
      ghostContainerEl,
    );

    const localPointInDragging = toLocalPoint(
      initClientX,
      initClientY,
      draggingEl,
      draggingRect,
    );

    const offsetTop = localPointInDragging.bounds.top;
    const offsetBottom = localPointInDragging.bounds.bottom;

    this.#insertGhostInfo = {
      localX,
      localY,
      width: 1,
      height: draggingRect.height,
      x1: localX,
      y1: localY - offsetTop,
      x2: localX + 1,
      y2: localY + offsetBottom,
      offsetLeft: 0,
      offsetTop: offsetTop,
      offsetRight: 0,
      offsetBottom: offsetBottom,
    };

    this.#insertGhostEl = insertGhostEl;
  }

  insertTo(x1, y1) {
    if (this.#insertGhostEl == null) {
      return;
    }

    this.#insertTo(x1, y1);
    this.#insertGhostEl.style.left = `${this.#insertGhostInfo.x1}px`;
    this.#insertGhostEl.style.top = `${this.#insertGhostInfo.y1}px`;
  }

  #insertTo(x1, y1) {
    this.#insertGhostInfo = {
      ...this.#insertGhostInfo,
      x1,
      y1,
      x2: x1 + 1,
      y2: y1 + this.#insertGhostInfo.height,
    };
  }

  dragTo(x1, y1) {
    if (this.#draggingGhostEl == null) {
      return;
    }

    this.#dragTo(x1, y1);
    this.#draggingGhostEl.style.left = `${this.#draggingGhostInfo.x1}px`;
    this.#draggingGhostEl.style.top = `${this.#draggingGhostInfo.y1}px`;
  }

  #dragTo(x1, y1) {
    this.#draggingGhostInfo = {
      ...this.#draggingGhostInfo,
      x1,
      y1,
      x2: x1 + this.#draggingGhostInfo.width,
      y2: y1 + this.#draggingGhostInfo.height,
    };
  }

  dragStartTo(x1) {
    if (this.#draggingGhostEl == null) {
      return;
    }

    this.#dragStartTo(x1);
    this.#draggingGhostEl.style.left = `${this.#draggingGhostInfo.x1}px`;
    this.#draggingGhostEl.style.width = `${this.#draggingGhostInfo.width}px`;
  }

  #dragStartTo(x1) {
    const deltaX = x1 - this.#draggingGhostInfo.x1;
    this.#draggingGhostInfo = {
      ...this.#draggingGhostInfo,
      x1,
      width: this.#draggingGhostInfo.width - deltaX,
    };
  }

  dragEndTo(x2) {
    if (this.#draggingGhostEl == null) {
      return;
    }

    this.#dragEndTo(x2);
    this.#draggingGhostEl.style.width = `${this.#draggingGhostInfo.width}px`;
  }

  #dragEndTo(x2) {
    const deltaX = x2 - this.#draggingGhostInfo.x2;
    this.#draggingGhostInfo = {
      ...this.#draggingGhostInfo,
      x2,
      width: this.#draggingGhostInfo.width + deltaX,
    };
  }

  destroy() {
    this.#delegateEl.removeEventListener("pointerdown", this.#pointerDown);

    window.removeEventListener("pointermove", this.#pointerMove);
    window.removeEventListener("pointerup", this.#pointerUp);
    window.removeEventListener("pointercancel", this.#pointerCancel);

    this.#endDragging();
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  onPointerDown(handler) {
    return this.#handler.on("pointerDownHandler", handler);
  }

  #emitPointerDown(event) {
    this.#handler.emit("pointerDownHandler", event);
  }

  onPointerMove(handler) {
    return this.#handler.on("pointerMoveHandler", handler);
  }

  #emitPointerMove(event) {
    this.#handler.emit("pointerMoveHandler", event);
  }

  onPointerUp(handler) {
    return this.#handler.on("pointerUpHandler", handler);
  }

  #emitPointerUp(event) {
    this.#handler.emit("pointerUpHandler", event);
  }

  onPointerCancel(handler) {
    return this.#handler.on("pointerCancelHandler", handler);
  }

  #emitPointerCancel(event) {
    this.#handler.emit("pointerCancelHandler", event);
  }
}
