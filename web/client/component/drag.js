import {
  assertHtmlElement,
  assertNonBlankString,
  assertNonNegativeInteger,
} from "./base/assert.js";
import { resolveElement, closestElement } from "./base/helper.js";
import { ElmHandler } from "./base/elm-handler.js";

export class DragDelegate {
  #handler = new ElmHandler();
  #containerEl = null;
  #draggingSelector = null;
  #targetSelector = null;
  #ignoreDraggingSelector = null;
  #draggingZIndex = 11;
  #draggingStartSelector = "[data-role='dragging-start']";
  #draggingEndSelector = "[data-role='dragging-end']";

  #pointerId = null;
  #originEl = null;
  #draggingEl = null;
  #draggingGhostEl = null;

  #mode = null;
  #initState = null;

  #state = new Map();

  constructor(
    container,
    draggingSelector,
    targetSelector,
    {
      ignoreDraggingSelector = null,
      draggingZIndex = null,
      draggingStartSelector = null,
      draggingEndSelector = null,
    } = {},
  ) {
    this.#containerEl = resolveElement(container);
    assertHtmlElement(this.#containerEl);

    assertNonBlankString(draggingSelector);
    assertNonBlankString(targetSelector);

    this.#draggingSelector = draggingSelector;
    this.#targetSelector = targetSelector;

    if (ignoreDraggingSelector !== null) {
      assertNonBlankString(ignoreDraggingSelector, "ignoreDraggingSelector");
      this.#ignoreDraggingSelector = ignoreDraggingSelector;
    }

    if (draggingZIndex !== null) {
      assertNonNegativeInteger(draggingZIndex, "draggingZIndex");
      this.#draggingZIndex = draggingZIndex;
    }

    if (draggingStartSelector !== null) {
      assertNonBlankString(draggingStartSelector, "draggingStartSelector");
      this.#draggingStartSelector = draggingStartSelector;
    }

    if (draggingEndSelector !== null) {
      assertNonBlankString(draggingEndSelector, "draggingEndSelector");
      this.#draggingEndSelector = draggingEndSelector;
    }

    this.#containerEl.addEventListener("pointerdown", this.#pointerDown);
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

    const draggingEl = closestElement(event, this.#draggingSelector);
    if (draggingEl == null) {
      return;
    }

    // initialize dragging mode

    let startEl = closestElement(event, this.#draggingStartSelector);
    if (startEl && !draggingEl.contains(startEl)) {
      return;
    }

    let endEl = closestElement(event, this.#draggingEndSelector);
    if (endEl && !draggingEl.contains(endEl)) {
      return;
    }

    if (startEl) {
      this.#mode = "dragging-start";
      startEl.style.zIndex = this.#draggingZIndex;

      endEl = draggingEl.querySelector(this.#draggingEndSelector);
      if (endEl) {
        endEl.style.zIndex = this.#draggingZIndex - 1;
      }
    } else if (endEl) {
      this.#mode = "dragging-end";
      endEl.style.zIndex = this.#draggingZIndex;

      startEl = draggingEl.querySelector(this.#draggingStartSelector);
      if (startEl) {
        startEl.style.zIndex = this.#draggingZIndex - 1;
      }
    } else {
      this.#mode = "move";
    }

    // initialize origin and dragging

    this.#originEl = this.#containerEl;
    this.#draggingEl = draggingEl;

    const originGeometry = this.#getElementGeometry(event, this.#originEl);
    const draggingGeometry = this.#getElementGeometry(
      event,
      this.#draggingEl,
      this.#originEl,
    );

    const initState = {
      clientX: event.clientX,
      clientY: event.clientY,
      origin: originGeometry,
      dragging: draggingGeometry,
    };

    this.#initState = initState;

    this.#pointerId = event.pointerId;
    event.preventDefault();

    const draggingInfo = this.#getDraggingInfo(event);
    this.#emitPointerDown(draggingInfo);
  };

  #pointerMove = (event) => {
    if (event.pointerId !== this.#pointerId) {
      return;
    }

    const { clientX, clientY } = this.#initState;

    if (this.#draggingGhostEl == null) {
      const deltaX = event.clientX - clientX;
      const deltaY = event.clientY - clientY;

      if (Math.hypot(deltaX, deltaY) >= 3) {
        this.#draggingGhostEl = this.#createDraggingGhost(
          this.#mode,
          deltaX,
          deltaY,
        );
      }
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
    this.#originEl = null;
    this.#draggingEl = null;

    this.#draggingGhostEl?.remove();
    this.#draggingGhostEl = null;

    this.#mode = null;
    this.#initState = null;

    this.#state.clear();
  }

  #createDraggingGhost(mode, deltaX = 0, deltaY = 0) {
    if (this.#draggingEl == null) {
      return null;
    }

    this.#draggingGhostEl?.remove();
    const ghost = this.#draggingEl.cloneNode(true);
    const rect = this.#draggingEl.getBoundingClientRect();

    ghost.style.pointerEvents = "none";
    ghost.classList.add("is-drag-ghost");

    ghost.style.position = "fixed";

    if (mode == "move") {
      ghost.style.left = `${rect.left + deltaX}px`;
      ghost.style.top = `${rect.top + deltaY}px`;
      ghost.style.width = `${rect.width}px`;
    } else if (mode == "dragging-start") {
      ghost.style.left = `${rect.left + deltaX}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.width = `${rect.width - deltaX}px`;
    } else if (mode == "dragging-end") {
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.width = `${rect.width + deltaX}px`;
    }

    document.body.appendChild(ghost);

    this.#draggingGhostEl = ghost;
    return ghost;
  }

  #getDraggingInfo(event) {
    const clientX = event.clientX;
    const clientY = event.clientY;

    const initState = this.#initState;

    const deltaX = clientX - initState.clientX;
    const deltaY = clientY - initState.clientY;

    const originGeometry = this.#getElementGeometry(event, this.#originEl);
    const draggingGeometry = this.#getElementGeometry(
      event,
      this.#draggingEl,
      this.#originEl,
    );

    const element = document.elementFromPoint(clientX, clientY);
    const target = element?.closest(this.#targetSelector) ?? null;
    const targetGeometry = this.#getElementGeometry(event, target);
    const draggingGhostGeometry = this.#getElementGeometry(
      event,
      this.#draggingGhostEl,
      target,
    );

    const isSameOrigin = target === this.#originEl;
    const isDragging = this.#draggingGhostEl != null;

    return {
      event,

      clientX,
      clientY,
      deltaX,
      deltaY,

      mode: this.#mode,
      initState,

      origin: originGeometry,
      dragging: draggingGeometry,
      draggingGhost: draggingGhostGeometry,
      target: targetGeometry,

      isSameOrigin: isSameOrigin,
      isDragging: isDragging,

      keys: {
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
      },
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

  #getElementGeometry(event, element, relativeElement = null) {
    if (element == null) {
      return null;
    }

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
