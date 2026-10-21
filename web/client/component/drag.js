import { assertHtmlElement, assertNonBlankString } from "./base/assert.js";
import { resolveElement, closestElement } from "./base/helper.js";
import { ElmHandler } from "./base/elm-handler.js";

export class DragDelegate {
  #handler = new ElmHandler();
  #container = null;
  #draggingSelector = null;
  #targetSelector = null;
  #ignoreDraggingSelector = null;

  #pointerId = null;
  #origin = null;
  #dragging = null;
  #draggingGhost = null;

  #state = new Map();

  constructor(
    container,
    draggingSelector,
    targetSelector,
    { ignoreDraggingSelector = null } = {},
  ) {
    this.#container = resolveElement(container);
    assertHtmlElement(this.#container);

    assertNonBlankString(draggingSelector);
    assertNonBlankString(targetSelector);

    this.#draggingSelector = draggingSelector;
    this.#targetSelector = targetSelector;

    if (ignoreDraggingSelector !== null) {
      assertNonBlankString(ignoreDraggingSelector);
      this.#ignoreDraggingSelector = ignoreDraggingSelector;
    }

    this.#container.addEventListener("pointerdown", this.#pointerDown);
    window.addEventListener("pointermove", this.#pointerMove);
    window.addEventListener("pointerup", this.#pointerUp);
    window.addEventListener("pointercancel", this.#pointerCancel);
  }

  getState(key) {
    return this.#state.get(key);
  }

  setState(key, value) {
    this.#state.set(key, value);
  }

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

    const dragging = closestElement(event, this.#draggingSelector);
    if (dragging == null) {
      return;
    }

    event.preventDefault();

    this.#pointerId = event.pointerId;
    this.#origin = this.#container;
    this.#dragging = dragging;
    this.#draggingGhost = this.#createDraggingGhost();

    const originGeometry = this.#getElementGeometry(event, this.#origin);
    const draggingGeometry = this.#getElementGeometry(
      event,
      this.#dragging,
      this.#origin,
    );
    const draggingGhostGeometry = this.#getElementGeometry(
      event,
      this.#draggingGhost,
    );

    const pointerDownState = {
      clientX: event.clientX,
      clientY: event.clientY,
      origin: originGeometry,
      dragging: draggingGeometry,
      draggingGhost: draggingGhostGeometry,
    };

    this.#state.set("pointerDownState", pointerDownState);

    const draggingInfo = this.#getDraggingInfo(event);
    this.#emitPointerDown(draggingInfo);
  };

  #pointerMove = (event) => {
    if (event.pointerId !== this.#pointerId) {
      return;
    }

    const draggingInfo = this.#getDraggingInfo(event);
    this.#emitPointerMove(draggingInfo);
  };

  #pointerUp = (event) => {
    if (event.pointerId !== this.#pointerId) {
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
    if (event.pointerId !== this.#pointerId) {
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
    this.#pointerId = null;
    this.#origin = null;
    this.#dragging = null;

    this.#draggingGhost?.remove();
    this.#draggingGhost = null;

    this.#state.clear();
  }

  #createDraggingGhost() {
    this.#draggingGhost?.remove();
    const ghost = this.#dragging.cloneNode(true);
    const rect = this.#dragging.getBoundingClientRect();

    ghost.style.pointerEvents = "none";
    ghost.classList.add("is-drag-ghost");

    ghost.style.position = "fixed";
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;

    document.body.appendChild(ghost);

    return ghost;
  }

  #getDraggingInfo(event) {
    const clientX = event.clientX;
    const clientY = event.clientY;

    const pointerDownState = this.#state.get("pointerDownState");

    const deltaX = clientX - pointerDownState.clientX;
    const deltaY = clientY - pointerDownState.clientY;

    const originGeometry = this.#getElementGeometry(event, this.#origin);
    const draggingGeometry = this.#getElementGeometry(
      event,
      this.#dragging,
      this.#origin,
    );

    const element = document.elementFromPoint(clientX, clientY);
    const target = element?.closest(this.#targetSelector) ?? null;

    const isSameOrigin = target === this.#origin;

    const targetGeometry = target
      ? this.#getElementGeometry(event, target)
      : null;
    const draggingGhostGeometry = this.#getElementGeometry(
      event,
      this.#draggingGhost,
      target,
    );

    return {
      event,
      clientX,
      clientY,
      deltaX,
      deltaY,
      origin: originGeometry,
      dragging: draggingGeometry,
      draggingGhost: draggingGhostGeometry,
      target: targetGeometry,
      isSameOrigin: isSameOrigin,
      keys: {
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
      },
    };
  }

  destroy() {
    this.#container.removeEventListener("pointerdown", this.#pointerDown);

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

  #getElementGeometry(event, element, relativeElement = null) {
    const rect = element.getBoundingClientRect();

    const info = {
      element,

      width: rect.width,
      height: rect.height,

      x1: rect.left,
      y1: rect.top,
      x2: rect.right,
      y2: rect.bottom,

      pointer: {
        localX: event.clientX - rect.left,
        localY: event.clientY - rect.top,

        left: event.clientX - rect.left,
        top: event.clientY - rect.top,
        right: rect.right - event.clientX,
        bottom: rect.bottom - event.clientY,
      },
    };

    if (relativeElement != null) {
      const relativeElementRect = relativeElement.getBoundingClientRect();

      info.left = rect.left - relativeElementRect.left;
      info.leftEnd = rect.right - relativeElementRect.left;
      info.top = rect.top - relativeElementRect.top;
      info.topEnd = rect.bottom - relativeElementRect.top;
      info.right = relativeElementRect.right - rect.right;
      info.bottom = relativeElementRect.bottom - rect.bottom;
    }

    return info;
  }
}
