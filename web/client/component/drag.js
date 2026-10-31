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

  #initClientX = null;
  #initClientY = null;
  #lastClientX = null;
  #direction = null;

  #mode = null;

  #delegateEl = null;
  #draggingEl = null;
  #draggingGhostEl = null;
  #draggingGhostInfo = null;
  #targetEl = null;

  #state = new Map();

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

  get draggingGhostEl() {
    return this.#draggingGhostEl;
  }

  get targetEl() {
    return this.#targetEl;
  }

  get isSameContainer() {
    return (
      this.#targetEl != null &&
      this.#delegateEl != null &&
      this.#targetEl === this.#delegateEl
    );
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

    const clientX = event.clientX;
    const clientY = event.clientY;

    this.#initClientX = clientX;
    this.#initClientY = clientY;
    this.#lastClientX = clientX;
    this.#direction = null;

    this.#draggingEl = draggingEl;

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

    const clientX = event.clientX;
    const clientY = event.clientY;

    // direction
    const deltaX = clientX - this.#lastClientX;

    if (deltaX > 0) {
      this.#direction = "right";
    } else if (deltaX < 0) {
      this.#direction = "left";
    }

    this.#lastClientX = clientX;
    // target
    const element = document.elementFromPoint(clientX, clientY);
    this.#targetEl = element?.closest(this.#targetSelector) ?? null;

    // dragging ghost
    if (this.#draggingGhostEl == null) {
      const deltaX = clientX - this.#initClientX;
      const deltaY = clientY - this.#initClientY;

      if (Math.hypot(deltaX, deltaY) >= 3) {
        this.#createDraggingGhost();
      }
    }

    if (this.#draggingGhostEl) {
      const ghostEl = this.#draggingGhostEl;
      const containerEl = this.#targetEl ? this.#targetEl : document.body;

      if (ghostEl.parentElement !== containerEl) {
        containerEl.append(ghostEl);
      }

      const { localX, localY } = toLocalPoint(clientX, clientY, containerEl);
      const { offsetLeft, offsetTop, offsetRight } = this.#draggingGhostInfo;

      const mode = this.#mode;

      if (mode == "move") {
        const x = localX - offsetLeft;
        const y = localY - offsetTop;
        this.#dragTo(x, y);
      } else if (mode == "dragging-start") {
        const x = localX - offsetLeft;
        this.#dragStartTo(x);
      } else if (mode == "dragging-end") {
        const x = localX + offsetRight;
        this.#dragEndTo(x);
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

    const containerEl = this.#targetEl ? this.#targetEl : document.body;
    containerEl.appendChild(ghostEl);

    const initClientX = this.#initClientX;
    const initClientY = this.#initClientY;

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

    // Let hit testing pass through the ghost so elementFromPoint()
    // can find the actual drop target underneath it.

    let { localX, localY } = toLocalPoint(
      initClientX,
      initClientY,
      containerEl,
    );

    ghostEl.style.left = `${localX - offsetLeft}px`;
    ghostEl.style.top = `${localY - offsetTop}px`;
    ghostEl.style.visibility = "";

    const { bounds } = toLocalPoint(initClientX, initClientY, ghostEl);
    this.#draggingGhostInfo = {
      offsetLeft: bounds.left,
      offsetTop: bounds.top,
      offsetRight: bounds.right,
      offsetBottom: bounds.bottom,
    };

    this.#draggingGhostEl = ghostEl;
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
  getElementMetrics(clientX, clientY, element, rect = null) {
    if (element == null) {
      return null;
    }

    if (rect == null) {
      rect = element.getBoundingClientRect();
    }

    return (info = {
      element,

      width: rect.width,
      height: rect.height,

      x1: rect.left,
      y1: rect.top,
      x2: rect.right,
      y2: rect.bottom,
    });
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

    const rect = element.getBoundingClientRect();

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
