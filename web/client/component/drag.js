import { assertHtmlElement, assertNonBlankString } from "./base/assert.js";
import { resolveElement, closestElement } from "./base/helper.js";
import { ElmHandler } from "./base/elm-handler.js";

export class DragDelegate {
  #handler = new ElmHandler();
  #containerEl = null;
  #selector = null;
  #ignoreSelector = null;
  #targetSelector = null;

  #stateValue = new Map();
  #draggingPointerId = null;
  #origin = null;
  #dragging = null;
  #draggingGhost = null;

  #startClientX = null;
  #startClientY = null;
  #startX = null;
  #startY = null;
  #offsetX = null;
  #offsetY = null;

  constructor(
    container,
    selector,
    { ignoreSelector = null, targetSelector = null } = {},
  ) {
    this.#containerEl = resolveElement(container);
    assertHtmlElement(this.#containerEl);

    assertNonBlankString(selector);
    this.#selector = selector;

    if (ignoreSelector !== null) {
      this.#ignoreSelector = ignoreSelector;
      assertNonBlankString(this.#ignoreSelector);
    }

    if (targetSelector !== null) {
      this.#targetSelector = targetSelector;
      assertNonBlankString(this.#targetSelector);
    }

    this.#containerEl.addEventListener("pointerdown", this.#pointerDown);
    window.addEventListener("pointermove", this.#pointerMove);
    window.addEventListener("pointerup", this.#pointerUp);
    window.addEventListener("pointercancel", this.#pointerCancel);
  }

  getState(key) {
    return this.#stateValue.get(key);
  }

  setState(key, value) {
    this.#stateValue.set(key, value);
  }

  #pointerDown = (event) => {
    if (this.#draggingPointerId != null) {
      return;
    }

    // 0: left, 1: middle, 2: right
    if (event.button !== 0) {
      return;
    }

    if (this.#ignoreSelector && closestElement(event, this.#ignoreSelector)) {
      return;
    }

    const draggingEl = closestElement(event, this.#selector);
    if (draggingEl == null) {
      return;
    }

    this.#draggingPointerId = event.pointerId;

    this.#origin = this.#containerEl;
    const originRect = this.#containerEl.getBoundingClientRect();
    this.#dragging = draggingEl;
    const draggingRect = draggingEl.getBoundingClientRect();

    this.#startClientX = event.clientX;
    this.#startClientY = event.clientY;
    this.#startX = event.clientX - originRect.left;
    this.#startY = event.clientY - originRect.top;
    this.#offsetX = event.clientX - draggingRect.left;
    this.#offsetY = event.clientY - draggingRect.top;

    event.preventDefault();

    const draggingInfo = this.#getDraggingInfo(event);
    this.#emitPointerDown(draggingInfo);
  };

  #pointerMove = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    if (this.#draggingGhost == null) {
      const deltaX = event.clientX - this.#startClientX;
      const deltaY = event.clientY - this.#startClientY;

      if (Math.hypot(deltaX, deltaY) >= 3) {
        this.#createDraggingGhost();
      }
    }

    const draggingInfo = this.#getDraggingInfo(event);
    this.#emitPointerMove(draggingInfo);
  };

  #pointerUp = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    const draggingInfo = this.#getDraggingInfo(event);

    try {
      this.#emitPointerUp(draggingInfo);
    } finally {
      this.#endDragging();
    }
  };

  #pointerCancel = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
    }

    const draggingInfo = this.#getDraggingInfo(event);

    try {
      this.#emitPointerCancel(draggingInfo);
    } finally {
      this.#endDragging();
    }
  };

  #endDragging() {
    this.#draggingPointerId = null;
    this.#origin = null;
    this.#dragging = null;

    this.#draggingGhost?.remove();
    this.#draggingGhost = null;

    this.#startClientX = null;
    this.#startClientY = null;
    this.#startX = null;
    this.#startY = null;
    this.#offsetX = null;
    this.#offsetY = null;

    this.#stateValue.clear();
  }

  #createDraggingGhost() {
    if (this.#dragging == null) {
      return;
    }

    this.#draggingGhost?.remove();
    this.#draggingGhost = this.#dragging.cloneNode(true);
    const draggingGhost = this.#draggingGhost;

    const rect = this.#dragging.getBoundingClientRect();

    draggingGhost.classList.add("is-drag-ghost");

    draggingGhost.style.position = "fixed";
    draggingGhost.style.left = `${rect.left}px`;
    draggingGhost.style.top = `${rect.top}px`;
    // draggingGhost.style.width = `${rect.width}px`;

    document.body.appendChild(draggingGhost);
  }

  #getDraggingInfo(event) {
    const clientX = event.clientX;
    const clientY = event.clientY;

    const originRect = this.#containerEl.getBoundingClientRect();
    const originLeft = originRect.left;
    const originTop = originRect.top;
    const originLocalX = clientX - originLeft;
    const originLocalY = clientY - originTop;

    let target = null;
    let targetRect = null;
    let targetLeft = null;
    let targetTop = null;
    let targetLocalX = null;
    let targetLocalY = null;

    if (this.#targetSelector) {
      const element = document.elementFromPoint(clientX, clientY);
      target = element?.closest(this.#targetSelector);

      if (target) {
        targetRect = target.getBoundingClientRect();
        targetLeft = targetRect.left;
        targetTop = targetRect.top;
        targetLocalX = clientX - targetLeft;
        targetLocalY = clientY - targetTop;
      }
    }

    const isSameOrigin = target === this.#containerEl;

    const draggingRect = this.#dragging?.getBoundingClientRect();
    const draggingGhostRect = this.#draggingGhost?.getBoundingClientRect();
    const draggingGhostLeft = draggingGhostRect?.left;
    const draggingGhostTop = draggingGhostRect?.top;

    return {
      event,
      clientX: clientX,
      clientY: clientY,
      startClientX: this.#startClientX,
      startClientY: this.#startClientY,
      startX: this.#startX,
      startY: this.#startY,
      offsetX: this.#offsetX,
      offsetY: this.#offsetY,
      draggingPointerId: this.#draggingPointerId,
      origin: this.#origin,
      originRect: originRect,
      originLeft: originLeft,
      originTop: originTop,
      originLocalX: originLocalX,
      originLocalY: originLocalY,
      target: target,
      targetRect: targetRect,
      targetLeft: targetLeft,
      targetTop: targetTop,
      targetLocalX: targetLocalX,
      targetLocalY: targetLocalY,
      isSameOrigin: isSameOrigin,
      dragging: this.#dragging,
      draggingRect: draggingRect,
      draggingGhost: this.#draggingGhost,
      draggingGhostRect: draggingGhostRect,
      draggingGhostLeft: draggingGhostLeft,
      draggingGhostTop: draggingGhostTop,
      isDragging: this.#draggingGhost != null,
    };
  }

  destroy() {
    this.#containerEl.removeEventListener("pointerdown", this.#pointerDown);

    window.removeEventListener("pointermove", this.#pointerMove);
    window.removeEventListener("pointerup", this.#pointerUp);
    window.removeEventListener("pointercancel", this.#pointerCancel);

    this.#endDragging();
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onPointerDown(handler) {
    this.#handler.set("pointerDownHandler", handler);
  }

  #emitPointerDown(draggingInfo) {
    this.#handler.emit("pointerDownHandler", draggingInfo);
  }

  set onPointerMove(handler) {
    this.#handler.set("pointerMoveHandler", handler);
  }

  #emitPointerMove(draggingInfo) {
    this.#handler.emit("pointerMoveHandler", draggingInfo);
  }

  set onPointerUp(handler) {
    this.#handler.set("pointerUpHandler", handler);
  }

  #emitPointerUp(draggingInfo) {
    this.#handler.emit("pointerUpHandler", draggingInfo);
  }

  set onPointerCancel(handler) {
    this.#handler.set("pointerCancelHandler", handler);
  }

  #emitPointerCancel(draggingInfo) {
    this.#handler.emit("pointerCancelHandler", draggingInfo);
  }
}
