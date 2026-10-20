import { on, closestElement } from "./helper.js";
import { DragDelegate } from "../component/drag.js";

export function setup({ trackListElm, getSnapPoints, trySnapTime } = {}) {
  const clipDrag = new DragDelegate(trackListElm.rootElement, ".clip", {
    ignoreSelector: ".audio-remove",
    targetSelector: ".clip-group",
  });

  on(clipDrag, "pointerDown", pointerDown);
  on(clipDrag, "pointerMove", pointerMove);
  on(clipDrag, "pointerUp", pointerUp);

  function pointerDown({ event, origin,dragging }) {
    const clipGroupEl = closestElement(event, ".clip-group");
    if (!clipGroupEl) {
      return;
    }

    const trackId = clipGroupEl.dataset.trackId;
    const clipGroupElm = trackListElm.getClipGroup(trackId);
    if (!clipGroupElm) {
      return;
    }
    clipDrag.setState("trackId", trackId);
    clipDrag.setState("clipGroupElm", clipGroupElm);

    const clipId = origin.dataset.value;
    const clipItem = clipGroupElm.getItemByValue(clipId);
    clipDrag.setState("clipItem", clipItem);

    let trimStartEl = closestElement(event, ".clip-trim-start");
    let trimEndEl = closestElement(event, ".clip-trim-end");

    if (trimStartEl) {
      trimEndEl = origin.querySelector(".clip-trim-end");
      trimStartEl.style.zIndex = 11;
      trimEndEl.style.zIndex = 10;
      // clipGroupEl.classList.add("is-trimming");
      clipDrag.setState("mode", "trim-start");
    } else if (trimEndEl) {
      trimStartEl = origin.querySelector(".clip-trim-start");
      trimStartEl.style.zIndex = 10;
      trimEndEl.style.zIndex = 11;
      // clipGroupEl.classList.add("is-trimming");
      clipDrag.setState("mode", "trim-end");
    } else {
      // clipGroupEl.classList.add("is-moving");
      clipDrag.setState("mode", "move");
    }

    const snapPoints = getSnapPoints();
    clipDrag.setState("snapPoints", snapPoints);console.log(dragging.style.width);
  }

  function pointerMove({
    dragging,
    draggingRect,
    draggingLeft,
    draggingGhost,
    draggingGhostRect,
    clientX,
    clientY,
    offsetX,
    offsetY,
    isDragging,
    target,
    targetLeft,
    targetTop,
    targetLocalX,
    targetLocalY,
    deltaX,
    deltaY,
    originLocalX,
    originLocalY,
    originLeft,
    startY,
  }) {
    if (!isDragging) {
      return;
    }

    let ghostLeft = clientX - offsetX;
    let ghostTop = clientY - offsetY;

    // calculate ghost position based on snapping and row alignment
    if (target) {
      const trackId = target.dataset.trackId;
      const clipGroupElm = trackListElm.getClipGroup(trackId);
      if (!clipGroupElm) {
        return;
      }

      const mode = clipDrag.getState("mode");
      if (mode === "move") {
        const targetLocalGhostLeft = targetLocalX - offsetX;
        const targetLocalGhostTop = targetLocalY - offsetY;

        const {
          time: clipStart,
          top,
          snapThreshold,
        } = clipGroupElm.resolvePosition(
          targetLocalGhostLeft,
          targetLocalGhostTop,
        );

        const snapPoints = clipDrag.getState("snapPoints");
        const snap = trySnapTime(
          clipStart,
          snapPoints,
          clipGroupElm.pixelsPerSecond,
          snapThreshold,
        );

        ghostLeft = targetLeft + snap.time * clipGroupElm.pixelsPerSecond;
        ghostTop = targetTop + top;

        draggingGhost.style.left = `${ghostLeft}px`;
        draggingGhost.style.top = `${ghostTop}px`;

        return;
      }

      if (mode === "trim-start") {
        let originLocalGhostLeft = originLocalX - offsetX;
        let originLocalGhostTop = startY - offsetY;

        const {
          time: clipStart,
          top,
          snapThreshold,
        } = clipGroupElm.resolvePosition(
          originLocalGhostLeft,
          originLocalGhostTop,
        );

        const snapPoints = clipDrag.getState("snapPoints");
        const snap = trySnapTime(
          clipStart,
          snapPoints,
          clipGroupElm.pixelsPerSecond,
          snapThreshold,
        );

         originLocalGhostLeft = snap.time * clipGroupElm.pixelsPerSecond;
        ghostLeft = originLeft + originLocalGhostLeft;

        const deltaWidth = ghostLeft - draggingLeft;

        draggingGhost.style.left = `${ghostLeft}px`;
        
        draggingGhost.style.width = `${draggingRect.width - deltaWidth}px`;
      }

      if (mode === "trim-end") {
        const offsetRight = draggingRect.width - offsetX;
        const originLocalGhostRight = originLocalX + offsetRight;
        const originLocalGhostTop = startY - offsetY;
        // console.log(originLocalGhostRight);

        const {
          time: clipEnd,
          top,
          snapThreshold,
        } = clipGroupElm.resolvePosition(
          originLocalGhostRight,
          originLocalGhostTop,
        );
        

        const snapPoints = clipDrag.getState("snapPoints");
        const snap = trySnapTime(
          clipEnd,
          snapPoints,
          clipGroupElm.pixelsPerSecond,
          snapThreshold,
        );console.log(snap.time);

        const ghostWidth = snap.time * clipGroupElm.pixelsPerSecond - (draggingLeft - targetLeft);
        console.log(ghostWidth,draggingLeft);

        draggingGhost.style.width = `${ghostWidth}px`;
      }
    }
  }

  function pointerUp({
    isDragging,
    dragging,
    target,
    targetLeft,
    targetTop,
    draggingGhostLeft,
    draggingGhostTop,
    draggingRect,
    offsetX,
    offsetY,
    draggingGhostRect,
    originLeft,
    originTop,
  }) {
    if (!isDragging) {
      return;
    }

    if (!target) {
      return;
    }

    const originTrackId = clipDrag.getState("trackId");
    const originClipGroupElm = trackListElm.getClipGroup(originTrackId);
    if (!originClipGroupElm) {
      return;
    }

    const targetTrackId = target.dataset.trackId;
    const targetClipGroupElm = trackListElm.getClipGroup(targetTrackId);
    if (!targetClipGroupElm) {
      return;
    }

    const clipId = dragging.dataset.value;
    const item = originClipGroupElm.getItemByValue(clipId);

    const mode = clipDrag.getState("mode");
    if (mode === "move") {
      const targetLocalGhostLeft = draggingGhostLeft - targetLeft;
      const targetLocalGhostTop = draggingGhostTop - targetTop;

      const { time: clipStart, rowIndex } = targetClipGroupElm.resolvePosition(
        targetLocalGhostLeft,
        targetLocalGhostTop,
      );

      item.clipStart = clipStart;
      item.rowIndex = rowIndex;

      if (originTrackId === targetTrackId) {
        originClipGroupElm.updateItem(item);
      } else {
        originClipGroupElm.removeItem(clipId);
        targetClipGroupElm.addItem(item);
      }
    }

    if (mode === "trim-start") {
      const originLocalGhostLeft = draggingGhostLeft - targetLeft;
      const originLocalGhostTop = draggingGhostTop - targetTop;

      const { time: clipStart } = originClipGroupElm.resolvePosition(
        originLocalGhostLeft,
        originLocalGhostTop,
      );

      const deltaTime = clipStart - item.clipStart;
      item.clipStart = clipStart;
      item.trimStart += deltaTime;
      originClipGroupElm.updateItem(item);
    }

    if (mode === "trim-end") {

      const offsetRight = draggingRect.width - offsetX;
        const originLocalGhostRight = draggingGhostLeft + draggingGhostRect.width - originLeft;
        const originLocalGhostTop = draggingGhostTop - originTop;

       const {
          time: clipEnd,
          top,
          snapThreshold,
        } = originClipGroupElm.resolvePosition(
          originLocalGhostRight,
          originLocalGhostTop,
        );

        const oldClipEnd = item.clipStart + (item.trimEnd - item.trimStart);

      const deltaTime = clipEnd - oldClipEnd;
      item.trimEnd += deltaTime;
      originClipGroupElm.updateItem(item);
    }
  }
}
