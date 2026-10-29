import { on, closestElement, clampValue } from "./helper.js";
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
    const clipId = drag.dragging.element.dataset.value;
    const clipGroupEl = closestElement(event, ".clip-group");
    const trackId = clipGroupEl.dataset.trackId;
    drag.setState("trackId", trackId);

    const clipGroupElm = trackListElm.getClipGroup(trackId);
    clipGroupElm.selectedClipId = clipId;

    const clipItem = clipGroupElm.getItemByValue(clipId);
    drag.setState("clipDuration", clipItem.trimEnd - clipItem.trimStart);

    const edge = drag.mode === "dragging-start" ? "start" : "end";
    if (edge === "start" || edge === "end") {
      const trimTimeRange = clipGroupElm.getClipTrimTimeRange(clipId, edge);
      drag.setState("trimTimeRange", trimTimeRange);
    }

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
      // clip group
      const trackId = target.element.dataset.trackId;
      const clipGroupElm = trackListElm.getClipGroup(trackId);
      if (!clipGroupElm) {
        return;
      }

      const draggingGhost = drag.draggingGhost;
      const snapPoints = drag.getState("snapPoints");
      const mode = drag.mode;

      if (mode === "move") {
        // determine the x position based on the drag direction
        const x =
          drag.direction === "left" ? draggingGhost.x1 : draggingGhost.x2;
        const localX = x - target.x1;
        let time = clipGroupElm.resolveTime(localX);

        if (!event.shiftKey) {
          const snap = trySnapTime(
            time,
            snapPoints,
            clipGroupElm.snapThreshold,
          );
          time = snap.time;
        }

        let clipStart;
        if (drag.direction === "left") {
          // time represents clipStart
          clipStart = time;
        } else {
          // time represents clipEnd
          const clipDuration = drag.getState("clipDuration");
          clipStart = time - clipDuration;
        }

        const x1 = target.x1 + clipStart * clipGroupElm.pixelsPerSecond;

        // determine the y position based on the drag direction
        const localY = draggingGhost.y1 - target.y1;
        const { rowIndex, top } = clipGroupElm.resolveRowPosition(localY);
        const y1 = target.y1 + top;

        drag.dragTo(x1, y1);

        drag.setState("clipStart", clipStart);
        drag.setState("rowIndex", rowIndex);

        return;
      }

      if (mode === "dragging-start") {
        const localX = draggingGhost.x1 - target.x1;
        let time = clipGroupElm.resolveTime(localX);

        // snap time if shift key is not pressed
        if (!event.shiftKey) {
          const snap = trySnapTime(
            time,
            snapPoints,
            clipGroupElm.snapThreshold,
          );
          time = snap.time;
        }

        // clamp time within the trim time range
        const { minTime, maxTime } = drag.getState("trimTimeRange");
        time = clampValue(time, minTime, maxTime);

        // update the dragging ghost position based on the new clip start time
        const x1 = target.x1 + time * clipGroupElm.pixelsPerSecond;
        drag.dragStartTo(x1);

        drag.setState("clipStart", time);

        return;
      }

      if (mode === "dragging-end") {
        const localX = draggingGhost.x2 - target.x1;
        let time = clipGroupElm.resolveTime(localX);

        // snap time if shift key is not pressed
        if (!event.shiftKey) {
          const snap = trySnapTime(
            time,
            snapPoints,
            clipGroupElm.snapThreshold,
          );
          time = snap.time;
        }
        // clamp time within the trim time range
        const { minTime, maxTime } = drag.getState("trimTimeRange");
        time = clampValue(time, minTime, maxTime);

        // update the dragging ghost position based on the new clip end time
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
    const originClipGroupElm = trackListElm.getClipGroup(originTrackId);
    if (!originClipGroupElm) {
      return;
    }

    const targetTrackId = target.element.dataset.trackId;
    const targetClipGroupElm = trackListElm.getClipGroup(targetTrackId);
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
      clipItem.trimStart = clampValue(
        clipItem.trimStart + deltaTime,
        clipItem.audioStart,
        clipItem.trimEnd,
      );

      originClipGroupElm.updateItem(clipItem);
    }

    if (mode === "dragging-end") {
      const oldClipEnd =
        clipItem.clipStart + (clipItem.trimEnd - clipItem.trimStart);
      const clipEnd = drag.getState("clipEnd");
      const deltaTime = clipEnd - oldClipEnd;

      clipItem.trimEnd = clampValue(
        clipItem.trimEnd + deltaTime,
        clipItem.trimStart,
        clipItem.audioEnd,
      );

      originClipGroupElm.updateItem(clipItem);
    }
  }
}
