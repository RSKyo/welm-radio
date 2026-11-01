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

  #delegateEl = null;
  #draggingEl = null;
  #ghostEl = null;
  #ghostInfo = null;
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

  get delegateEl() {
    return this.#delegateEl;
  }

  get draggingEl() {
    return this.#draggingEl;
  }

  get ghostEl() {
    return this.#ghostEl;
  }

  get ghostInfo() {
    return this.#ghostInfo;
  }

  get targetEl() {
    return this.#targetEl;
  }

  hasTarget() {
    return this.#targetEl != null;
  }

  get isDragging() {
    return this.#ghostEl != null;
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
    if (this.#ghostEl == null) {
      const deltaX = clientX - initClientX;
      const deltaY = clientY - initClientY;

      if (Math.hypot(deltaX, deltaY) >= 3) {
        this.#createDraggingGhost();
      }
    }

    const ghostEl = this.#ghostEl;
    if (ghostEl) {
      const ghostInfo = this.#ghostInfo;
      const mode = this.#mode;

      if (mode == "move") {
        const element = document.elementFromPoint(clientX, clientY);
        const targetEl = element?.closest(this.#targetSelector) ?? null;
        this.#targetEl = targetEl;

        const ghostContainerEl = targetEl ?? document.body;

        if (ghostEl.parentElement !== ghostContainerEl) {
          ghostContainerEl.append(ghostEl);
        }

        const { localX, localY } = toLocalPoint(
          clientX,
          clientY,
          ghostContainerEl,
        );

        this.#ghostInfo = {
          ...this.#ghostInfo,
          x1: localX - ghostInfo.offsetLeft,
          y1: localY - ghostInfo.offsetTop,
          x2: localX + ghostInfo.offsetRight,
          y2: localY + ghostInfo.offsetBottom,
        };
      } else if (mode == "dragging-start") {
        const { localX } = toLocalPoint(clientX, clientY, this.#targetEl);

        this.#ghostInfo = {
          ...this.#ghostInfo,
          x1: localX - ghostInfo.offsetLeft,
          width: ghostInfo.x2 - localX + ghostInfo.offsetLeft,
        };
      } else if (mode == "dragging-end") {
        const { localX } = toLocalPoint(clientX, clientY, this.#targetEl);

        this.#ghostInfo = {
          ...this.#ghostInfo,
          x2: localX + ghostInfo.offsetRight,
          width: localX + ghostInfo.offsetRight - ghostInfo.x1,
        };
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
    this.#ghostEl?.remove();

    this.#pointerId = null;
    this.#initClientX = null;
    this.#initClientY = null;
    this.#mode = null;

    this.#draggingEl = null;
    this.#ghostEl = null;
    this.#ghostInfo = null;
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
    const ghostEl = draggingEl.cloneNode(true);

    ghostEl.style.pointerEvents = "none";
    ghostEl.classList.add("is-drag-ghost");

    ghostEl.style.position = "absolute";
    ghostEl.style.visibility = "hidden";

    const ghostContainerEl = this.#targetEl ?? document.body;
    ghostContainerEl.appendChild(ghostEl);

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

    const ghostRect = ghostEl.getBoundingClientRect();
    const offsetLeft = ghostRect.width * ratioX;
    const offsetTop = ghostRect.height * ratioY;

    const width = ghostRect.width;
    const height = ghostRect.height;
    const x1 = localX - offsetLeft;
    const y1 = localY - offsetTop;
    const x2 = x1 + width;
    const y2 = y1 + height;

    ghostEl.style.left = `${x1}px`;
    ghostEl.style.top = `${y1}px`;
    ghostEl.style.visibility = "";

    const { bounds } = toLocalPoint(initClientX, initClientY, ghostEl);
    this.#ghostInfo = {
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

    this.#ghostEl = ghostEl;
  }

  dragGhostTo(x1, y1, width = null) {
    if (this.#ghostEl == null) {
      return;
    }

    width ??= this.#ghostInfo.width;

    const height = this.#ghostInfo.height;
    const x2 = x1 + width;
    const y2 = y1 + height;

    this.#ghostEl.style.left = `${x1}px`;
    this.#ghostEl.style.top = `${y1}px`;
    this.#ghostEl.style.width = `${width}px`;

    this.#ghostInfo = {
      ...this.#ghostInfo,
      width,
      x1,
      y1,
      x2,
      y2,
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
