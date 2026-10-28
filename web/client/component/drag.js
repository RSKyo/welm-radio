import { assertHtmlElement, assertNonBlankString } from "./base/assert.js";
import { resolveElement, closestElement } from "./base/helper.js";
import { ElmHandler } from "./base/elm-handler.js";

const DRAGGING_START_SELECTOR = "[data-role='dragging-start']";
const DRAGGING_END_SELECTOR = "[data-role='dragging-end']";

export class DragDelegate {
  #handler = new ElmHandler();
  #containerEl = null;
  #draggingSelector = null;
  #targetSelector = null;
  #ignoreDraggingSelector = null;

  #pointerId = null;

  #initClientX = null;
  #initClientY = null;
  #mode = null;
  #origin = null;
  #dragging = null;
  #draggingGhost = null;
  #target = null;

  #lastClientX = null;
  #direction = null;

  #state = new Map();

  constructor(
    container,
    draggingSelector,
    targetSelector,
    { ignoreDraggingSelector = null } = {},
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

  get mode() {
    return this.#mode;
  }

  get origin() {
    return this.#cloneMetrics(this.#origin);
  }

  get dragging() {
    return this.#cloneMetrics(this.#dragging);
  }

  get draggingGhost() {
    return this.#cloneMetrics(this.#draggingGhost);
  }

  get target() {
    return this.#cloneMetrics(this.#target);
  }

  get isSameContainer() {
    return (
      this.#target != null &&
      this.#origin != null &&
      this.#target.element === this.#origin.element
    );
  }

  get isDragging() {
    return this.#draggingGhost != null;
  }

  get direction() {
    return this.#direction;
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

    // dragging mode

    let startEl = closestElement(event, DRAGGING_START_SELECTOR);
    if (startEl && !draggingEl.contains(startEl)) {
      return;
    }

    let endEl = closestElement(event, DRAGGING_END_SELECTOR);
    if (endEl && !draggingEl.contains(endEl)) {
      return;
    }

    this.#mode = "move";
    if (startEl) {
      this.#mode = "dragging-start";
    } else if (endEl) {
      this.#mode = "dragging-end";
    }

    this.#lastClientX = event.clientX;
    this.#direction = null;

    const clientX = event.clientX;
    const clientY = event.clientY;

    this.#initClientX = clientX;
    this.#initClientY = clientY;

    this.#origin = this.getElementMetrics(clientX, clientY, this.#containerEl);
    this.#dragging = this.getElementMetrics(
      clientX,
      clientY,
      draggingEl,
      this.#containerEl,
    );

    this.#pointerId = event.pointerId;
    event.preventDefault();

    this.#emitPointerDown(event);
  };

  #pointerMove = (event) => {
    if (event.pointerId !== this.#pointerId) {
      return;
    }

    const deltaX = event.clientX - this.#lastClientX;
    if (deltaX < 0) {
      this.#direction = "left";
    } else if (deltaX > 0) {
      this.#direction = "right";
    }
    this.#lastClientX = event.clientX;

    const clientX = event.clientX;
    const clientY = event.clientY;

    // Create the ghost only after the pointer has moved far enough
    // to avoid treating a click as a drag.
    //
    // Although the ghost is created later, its initial pointer metrics
    // must still match the pointer-down state of the original element.
    if (this.#draggingGhost == null) {
      const deltaX = clientX - this.#initClientX;
      const deltaY = clientY - this.#initClientY;

      if (Math.hypot(deltaX, deltaY) >= 3) {
        const draggingGhostEl = this.#createDraggingGhost();
        this.#draggingGhost = this.getElementMetrics(
          this.#initClientX,
          this.#initClientY,
          draggingGhostEl,
        );
      }
    }

    // target
    const element = document.elementFromPoint(clientX, clientY);
    const targetEl = element?.closest(this.#targetSelector) ?? null;
    this.#target = this.getElementMetrics(clientX, clientY, targetEl);

    // Update the raw ghost metrics from the current pointer position.
    //
    // The ghost DOM is not updated here. The pointerMove handler may
    // adjust the position first, for example by applying snapping,
    // and then commit it through dragTo(), dragStartTo(), or dragEndTo().
    if (this.#draggingGhost) {
      const mode = this.#mode;
      const offsetLeft = this.#draggingGhost.pointer.left;
      const offsetTop = this.#draggingGhost.pointer.top;
      const offsetRight = this.#draggingGhost.pointer.right;
      const offsetBottom = this.#draggingGhost.pointer.bottom;

      if (mode == "move") {
        const x = clientX - offsetLeft;
        const y = clientY - offsetTop;
        this.#dragTo(x, y);
      } else if (mode == "dragging-start") {
        const x = clientX - offsetLeft;
        this.#dragStartTo(x);
      } else if (mode == "dragging-end") {
        const x = clientX + offsetRight;
        this.#dragEndTo(x);
      }
    }

    this.#emitPointerMove(event);
  };

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
    this.#pointerId = null;
    this.#initClientX = null;
    this.#initClientY = null;
    this.#mode = null;
    this.#origin = null;
    this.#dragging = null;
    this.#draggingGhost?.element.remove();
    this.#draggingGhost = null;
    this.#target = null;

    this.#lastClientX = null;
    this.#direction = null;

    this.#state.clear();
  }

  #createDraggingGhost(event) {
    if (this.#dragging == null) {
      return null;
    }

    const dragging = this.#dragging;
    const pointerRatioX = dragging.pointer.left / dragging.width;
    const pointerRatioY = dragging.pointer.top / dragging.height;

    const ghost = dragging.element.cloneNode(true);

    // Let hit testing pass through the ghost so elementFromPoint()
    // can find the actual drop target underneath it.
    ghost.style.pointerEvents = "none";
    ghost.classList.add("is-drag-ghost");

    ghost.style.position = "fixed";
    ghost.style.visibility = "hidden";

    document.body.appendChild(ghost);

    const ghostRect = ghost.getBoundingClientRect();

    const pointerLeft = ghostRect.width * pointerRatioX;
    const pointerTop = ghostRect.height * pointerRatioY;

    ghost.style.left = `${this.#initClientX - pointerLeft}px`;
    ghost.style.top = `${this.#initClientY - pointerTop}px`;

    ghost.style.visibility = "";

    return ghost;
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

  /**
   * Measure an element in viewport coordinates and, when the given
   * pointer is inside it, record the pointer offsets from its edges.
   *
   * x1/y1/x2/y2 are viewport coordinates.
   * left/top/right/bottom are distances relative to relativeElement.
   */
  getElementMetrics(clientX, clientY, element, relativeElement = null) {
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
    };

    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      info.pointer = {
        localX: clientX - rect.left,
        localY: clientY - rect.top,

        left: clientX - rect.left,
        top: clientY - rect.top,
        right: rect.right - clientX,
        bottom: rect.bottom - clientY,
      };
    }

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

  // Update ghost metrics only.
  // The DOM is intentionally left unchanged until the final position
  // has been adjusted by external drag logic such as snapping.
  #dragTo(x, y) {
    const draggingGhost = this.#draggingGhost;
    const deltaX = x - draggingGhost.x1;
    const deltaY = y - draggingGhost.y1;

    draggingGhost.x1 += deltaX;
    draggingGhost.y1 += deltaY;
    draggingGhost.x2 += deltaX;
    draggingGhost.y2 += deltaY;
  }

  // Apply the final drag position to both the ghost metrics and DOM.
  dragTo(x, y) {
    if (this.#draggingGhost == null) {
      return;
    }

    this.#dragTo(x, y);

    const { element, x1, y1 } = this.#draggingGhost;
    element.style.left = `${x1}px`;
    element.style.top = `${y1}px`;
  }

  // Update ghost metrics only.
  // The DOM is intentionally left unchanged until the final position
  // has been adjusted by external drag logic such as snapping.
  #dragStartTo(x) {
    const draggingGhost = this.#draggingGhost;

    if (x > draggingGhost.x2) {
      x = draggingGhost.x2;
    }

    const deltaX = x - draggingGhost.x1;

    draggingGhost.x1 += deltaX;
    draggingGhost.width -= deltaX;
  }

  // Apply the final start-edge position.
  dragStartTo(x) {
    if (this.#draggingGhost == null) {
      return;
    }

    this.#dragStartTo(x);

    const { element, x1, width } = this.#draggingGhost;
    element.style.left = `${x1}px`;
    element.style.width = `${width}px`;

    // // 临时调试
    // const style = getComputedStyle(element);
    // const rect = element.getBoundingClientRect();

    // console.log({
    //   internalX1: x1,
    //   internalX2: this.#draggingGhost.x2,
    //   domX1: rect.left,
    //   domX2: rect.right,
    //   internalWidth: width,
    //   domWidth: rect.width,

    //   boxSizing: style.boxSizing,
    //   borderLeftWidth: style.borderLeftWidth,
    //   borderRightWidth: style.borderRightWidth,
    //   minWidth: style.minWidth,
    //   transform: style.transform,
    // });
  }

  // Update ghost metrics only.
  // The DOM is intentionally left unchanged until the final position
  // has been adjusted by external drag logic such as snapping.
  #dragEndTo(x) {
    const draggingGhost = this.#draggingGhost;

    if (x < draggingGhost.x1) {
      x = draggingGhost.x1;
    }

    const deltaX = x - draggingGhost.x2;

    draggingGhost.x2 += deltaX;
    draggingGhost.width += deltaX;
  }

  // Apply the final end-edge position.
  dragEndTo(x) {
    if (this.#draggingGhost == null) {
      return;
    }

    this.#dragEndTo(x);

    const { element, width } = this.#draggingGhost;
    element.style.width = `${width}px`;
  }

  // Return an isolated metrics snapshot.
  // Keep the HTMLElement reference, but clone the nested pointer object
  // so external drag logic cannot mutate internal pointer metrics.
  #cloneMetrics(metrics) {
    if (metrics == null) {
      return null;
    }

    return {
      ...metrics,
      pointer: metrics.pointer ? { ...metrics.pointer } : null,
    };
  }
}
