import { on, closestElement } from "./helper.js";
import { DragDelegate } from "../component/drag.js";

export function setup({ trackListElm, getSnapPoints, trySnapTime } = {}) {
  // drag delegate component
  const drag = new DragDelegate(
    trackListElm.rootElement,
    ".clip",
    ".clip-group",
  );

  /** bind events */

  on(drag, "pointerDown", pointerDown);
  on(drag, "pointerMove", pointerMove);
  on(drag, "pointerUp", pointerUp);

  /** pointer down handler */

  function pointerDown(event) {
    const clipGroupEl = closestElement(event, ".clip-group");
    const trackId = clipGroupEl.dataset.trackId;
    drag.setState("trackId", trackId);

    const snapPoints = getSnapPoints();
    drag.setState("snapPoints", snapPoints);
  }

  /** pointer move handler */

  function pointerMove(event) {
    if (!drag.isDragging) {
      return;
    }

    const target = drag.target;
    if (target) {
      const trackId = target.element.dataset.trackId;
      const clipGroupElm = trackListElm.findClipGroup(trackId);
      if (!clipGroupElm) {
        return;
      }

      const draggingGhost = drag.draggingGhost;
      const snapPoints = drag.getState("snapPoints");
      const mode = drag.mode;

      if (mode === "move") {
        const localX = draggingGhost.x1 - target.x1;
        const localY = draggingGhost.y1 - target.y1;

        let time = clipGroupElm.resolveTime(localX);
        const { rowIndex, top } = clipGroupElm.resolveRowPosition(localY);

        if (!event.shiftKey) {
          const snap = trySnapTime(
            time,
            snapPoints,
            clipGroupElm.snapThreshold,
          );
          time = snap.time;
        }

        const x1 = target.x1 + time * clipGroupElm.pixelsPerSecond;
        const y1 = target.y1 + top;
        drag.dragTo(x1, y1);

        drag.setState("clipStart", time);
        drag.setState("rowIndex", rowIndex);

        return;
      }

      if (mode === "dragging-start") {
        const localX = draggingGhost.x1 - target.x1;
        let time = clipGroupElm.resolveTime(localX);

        if (!event.shiftKey) {
          const snap = trySnapTime(
            time,
            snapPoints,
            clipGroupElm.snapThreshold,
          );
          time = snap.time;
        }

        const x1 = target.x1 + time * clipGroupElm.pixelsPerSecond;
        drag.dragStartTo(x1);

        drag.setState("clipStart", time);

        return;
      }

      if (mode === "dragging-end") {
        const localX = draggingGhost.x2 - target.x1;
        let time = clipGroupElm.resolveTime(localX);

        if (!event.shiftKey) {
          const snap = trySnapTime(
            time,
            snapPoints,
            clipGroupElm.snapThreshold,
          );
          time = snap.time;
        }

        const x2 = target.x1 + time * clipGroupElm.pixelsPerSecond;
        drag.dragEndTo(x2);

        drag.setState("clipEnd", time);

        return;
      }
    }
  }

  /** pointer up handler */

  function pointerUp() {
    if (!drag.isDragging) {
      return;
    }

    const target = drag.target;
    if (!target) {
      return;
    }

    const originTrackId = drag.getState("trackId");
    const originClipGroupElm = trackListElm.findClipGroup(originTrackId);
    if (!originClipGroupElm) {
      return;
    }

    const targetTrackId = target.element.dataset.trackId;
    const targetClipGroupElm = trackListElm.findClipGroup(targetTrackId);
    if (!targetClipGroupElm) {
      return;
    }

    const clipId = drag.dragging.element.dataset.value;
    const clipItem = originClipGroupElm.getItemByValue(clipId);

    const mode = drag.mode;
    if (mode === "move") {
      clipItem.clipStart = drag.getState("clipStart");
      clipItem.rowIndex = drag.getState("rowIndex");

      if (originTrackId === targetTrackId) {
        originClipGroupElm.updateItem(clipItem);
      } else {
        originClipGroupElm.removeItem(clipId);
        targetClipGroupElm.addItem(clipItem);
      }
    }

    if (mode === "dragging-start") {
      const clipStart = drag.getState("clipStart");
      const deltaTime = clipStart - clipItem.clipStart;

      clipItem.clipStart = clipStart;
      clipItem.trimStart += deltaTime;

      originClipGroupElm.updateItem(clipItem);
    }

    if (mode === "dragging-end") {
      const oldClipEnd =
        clipItem.clipStart + (clipItem.trimEnd - clipItem.trimStart);
      const clipEnd = drag.getState("clipEnd");
      const deltaTime = clipEnd - oldClipEnd;

      clipItem.trimEnd += deltaTime;
      originClipGroupElm.updateItem(clipItem);
    }
  }
}
