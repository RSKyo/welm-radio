import { assertHtmlElement, assertNonBlankString } from "./base/assert.js";
import { resolveElement } from "./base/helper.js";
import { ElmHandler } from "./base/elm-handler.js";

export class DragDelegate {
  #handler = new ElmHandler();
  #containerEl = null;
  #selector = null;
  #ignoreSelector = null;

  #stateValue = new Map();
  #draggingPointerId = null;
  #draggingEl = null;
  #draggingGhostEl = null;

  #startX = null;
  #startY = null;
  #offsetX = null;
  #offsetY = null;

  constructor(container, selector, { ignoreSelector = null } = {}) {
    this.#containerEl = resolveElement(container);
    assertHtmlElement(this.#containerEl);

    assertNonBlankString(selector);
    this.#selector = selector;

    if (ignoreSelector !== null) {
      this.#ignoreSelector = ignoreSelector;
      assertNonBlankString(this.#ignoreSelector);
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

    if (
      this.#ignoreSelector &&
      this.#closestElement(event, this.#ignoreSelector)
    ) {
      return;
    }

    const draggingEl = this.#closestElement(event, this.#selector);
    if (draggingEl == null) {
      return;
    }

    this.#draggingEl = draggingEl;
    this.#draggingPointerId = event.pointerId;

    event.preventDefault();

    const draggingInfo = this.#getDraggingInfo(event);
    this.#emitPointerDown(draggingInfo);
  };

  #pointerMove = (event) => {
    if (event.pointerId !== this.#draggingPointerId) {
      return;
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
    this.#draggingEl = null;

    this.#draggingGhostEl?.remove();
    this.#draggingGhostEl = null;

    this.#startX = null;
    this.#startY = null;
    this.#offsetX = null;
    this.#offsetY = null;

    this.#stateValue.clear();
  }

  #createDraggingGhost() {
    if (this.#draggingEl == null) {
      return;
    }

    this.#draggingGhostEl?.remove();

    const rect = this.#draggingEl.getBoundingClientRect();

    this.#draggingGhostEl = this.#draggingEl.cloneNode(true);
    this.#draggingGhostEl.classList.add("is-drag-ghost");

    this.#draggingGhostEl.style.position = "fixed";
    this.#draggingGhostEl.style.left = `${rect.left}px`;
    this.#draggingGhostEl.style.top = `${rect.top}px`;
    this.#draggingGhostEl.style.width = `${rect.width}px`;

    document.body.appendChild(this.#draggingGhostEl);
  }

  #getDraggingInfo(event) {
    const clientX = event.clientX;
    const clientY = event.clientY;

    const containerElRect = this.#containerEl.getBoundingClientRect();

    const x = clientX - containerElRect.left;
    const y = clientY - containerElRect.top;

    if (this.#startX == null || this.#startY == null) {
      this.#startX = x;
      this.#startY = y;
    }
    const deltaX = x - this.#startX;
    const deltaY = y - this.#startY;

    const draggingElRect = this.#draggingEl.getBoundingClientRect();

    if (this.#offsetX == null || this.#offsetY == null) {
      this.#offsetX = clientX - draggingElRect.left;
      this.#offsetY = clientY - draggingElRect.top;
    }

    if (this.#draggingGhostEl == null && Math.hypot(deltaX, deltaY) >= 3) {
      this.#createDraggingGhost();
    }

    const draggingGhostRect = this.#draggingGhostEl?.getBoundingClientRect();

    return {
      event,
      draggingPointerId: this.#draggingPointerId,
      containerEl: this.#containerEl,
      containerElRect: containerElRect,
      draggingEl: this.#draggingEl,
      draggingElRect: draggingElRect,
      draggingGhostEl: this.#draggingGhostEl,
      draggingGhostRect: draggingGhostRect,
      clientX: clientX,
      clientY: clientY,
      startX: this.#startX,
      startY: this.#startY,
      x: x,
      y: y,
      deltaX: deltaX,
      deltaY: deltaY,
      offsetX: this.#offsetX,
      offsetY: this.#offsetY,
      isDragging: this.#draggingGhostEl != null,
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

  // -----------------------------------------------------------------------------
  // methods
  // -----------------------------------------------------------------------------

  #closestElement(event, selector) {
    assertNonBlankString(selector, "selector");

    const { target, currentTarget } = event;

    if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
      return null;
    }

    const element = target.closest(selector);

    if (element == null || !currentTarget.contains(element)) {
      return null;
    }

    return element;
  }
}
