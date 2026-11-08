import { on, closestElement, clampValue } from "./helper.js";
import { DragDelegate } from "../component/drag.js";

export function setup({ trackListElm, getSnapPoints, trySnapTime } = {}) {
  // drag delegate component
  const clipDrag = new DragDelegate(
    trackListElm.rootElement,
    ".clip",
    ".clip-group",
  );

  /** bind events */

  on(clipDrag, "pointerDown", pointerDown);
  on(clipDrag, "pointerMove", pointerMove);
  on(clipDrag, "pointerUp", pointerUp);

  /** pointer down handler */

  function pointerDown(event) {
    const clipId = clipDrag.draggingEl.dataset.value;
    const clipGroupEl = closestElement(event, ".clip-group");
    const trackId = clipGroupEl.dataset.trackId;
    clipDrag.setState("trackId", trackId);

    const clipGroupElm = trackListElm.getClipGroup(trackId);
    clipGroupElm.selectedClipId = clipId;

    if (clipDrag.mode !== "move") {
      const edge = clipDrag.mode === "dragging-start" ? "start" : "end";

      clipDrag.setState(
        "trimTimeRange",
        clipGroupElm.getClipTrimTimeRange(clipId, edge),
      );
    }

    const snapPoints = getSnapPoints();
    clipDrag.setState("snapPoints", snapPoints);
  }

  /** pointer move handler */

  function pointerMove(event) {
    if (!clipDrag.isDragging) {
      return;
    }

    const mode = clipDrag.mode;
    if (mode === "move") {
      const moveMode = clipDrag.moveMode;
      if (moveMode === "normal") {
        const draggingGhostInfo = clipDrag.draggingGhostInfo;
        let x1 = draggingGhostInfo.x1;
        let y1 = draggingGhostInfo.y1;

        if (clipDrag.hasTarget) {
          const trackId = clipDrag.targetEl.dataset.trackId;
          const clipGroupElm = trackListElm.getClipGroup(trackId);

          if (!event.shiftKey) {
            const snapPoints = clipDrag.getState("snapPoints");

            if (clipDrag.direction === "left") {
              const snap = trySnapTime(
                clipGroupElm.resolveTime(draggingGhostInfo.x1),
                snapPoints,
                clipGroupElm.snapThreshold,
              );
              x1 = snap.time * clipGroupElm.pixelsPerSecond;
            } else if (clipDrag.direction === "right") {
              const snap = trySnapTime(
                clipGroupElm.resolveTime(draggingGhostInfo.x2),
                snapPoints,
                clipGroupElm.snapThreshold,
              );
              const x2 = snap.time * clipGroupElm.pixelsPerSecond;
              x1 = x1 + (x2 - draggingGhostInfo.x2);
            }
          }

          const { rowIndex, top } = clipGroupElm.resolveRowPosition(y1);
          y1 = top;

          const clipStart = clipGroupElm.resolveTime(x1);
          clipDrag.setState("clipStart", clipStart);
          clipDrag.setState("rowIndex", rowIndex);
        }

        clipDrag.dragTo(x1, y1);
      }

      if (moveMode === "insert") {
        const insertGhostInfo = clipDrag.insertGhostInfo;
        let x1 = insertGhostInfo.x1;
        let y1 = insertGhostInfo.y1;

        if (clipDrag.hasTarget) {
          const trackId = clipDrag.targetEl.dataset.trackId;
          const clipGroupElm = trackListElm.getClipGroup(trackId);

          if (!event.shiftKey) {
            const snapPoints = clipDrag.getState("snapPoints");
            const snap = trySnapTime(
              clipGroupElm.resolveTime(x1),
              snapPoints,
              clipGroupElm.snapThreshold,
            );
            x1 = snap.time * clipGroupElm.pixelsPerSecond;
          }

          const localY = insertGhostInfo.localY;
          const { rowIndex, clipTop } = clipGroupElm.resolveRowPosition(localY);
          y1 = clipTop;

          const clipStart = clipGroupElm.resolveTime(x1);
          clipDrag.setState("clipStart", clipStart);
          clipDrag.setState("rowIndex", rowIndex);
        }

        clipDrag.insertTo(x1, y1);
      }

      return;
    }

    if (mode === "dragging-start") {
      const trackId = clipDrag.targetEl.dataset.trackId;
      const clipGroupElm = trackListElm.getClipGroup(trackId);
      const snapPoints = clipDrag.getState("snapPoints");

      const draggingGhostInfo = clipDrag.draggingGhostInfo;
      let x1 = draggingGhostInfo.x1;
      // snap time if shift key is not pressed
      if (!event.shiftKey) {
        const snap = trySnapTime(
          clipGroupElm.resolveTime(x1),
          snapPoints,
          clipGroupElm.snapThreshold,
        );
        x1 = snap.time * clipGroupElm.pixelsPerSecond;
      }

      let clipStart = clipGroupElm.resolveTime(x1);

      // clamp clip start within the trim time range
      const { minTime, maxTime } = clipDrag.getState("trimTimeRange");
      clipStart = clampValue(clipStart, minTime, maxTime);
      clipDrag.setState("clipStart", clipStart);

      // update the dragging ghost position based on the new clip start time
      x1 = clipStart * clipGroupElm.pixelsPerSecond;
      clipDrag.dragStartTo(x1);

      return;
    }

    if (mode === "dragging-end") {
      const trackId = clipDrag.targetEl.dataset.trackId;
      const clipGroupElm = trackListElm.getClipGroup(trackId);
      const snapPoints = clipDrag.getState("snapPoints");

      const draggingGhostInfo = clipDrag.draggingGhostInfo;
      let x2 = draggingGhostInfo.x2;
      // snap time if shift key is not pressed
      if (!event.shiftKey) {
        const snap = trySnapTime(
          clipGroupElm.resolveTime(x2),
          snapPoints,
          clipGroupElm.snapThreshold,
        );
        x2 = snap.time * clipGroupElm.pixelsPerSecond;
      }

      let clipEnd = clipGroupElm.resolveTime(x2);

      // clamp clip end within the trim time range
      const { minTime, maxTime } = clipDrag.getState("trimTimeRange");
      clipEnd = clampValue(clipEnd, minTime, maxTime);
      clipDrag.setState("clipEnd", clipEnd);

      // update the dragging ghost position based on the new clip end time
      x2 = clipEnd * clipGroupElm.pixelsPerSecond;
      clipDrag.dragEndTo(x2);

      return;
    }
  }

  /** pointer up handler */

  function pointerUp() {
    if (!clipDrag.isDragging) {
      return;
    }

    if (!clipDrag.hasTarget) {
      return;
    }

    const originTrackId = clipDrag.getState("trackId");
    const originClipGroupElm = trackListElm.getClipGroup(originTrackId);
    if (!originClipGroupElm) {
      return;
    }

    const targetTrackId = clipDrag.targetEl.dataset.trackId;
    const targetClipGroupElm = trackListElm.getClipGroup(targetTrackId);
    if (!targetClipGroupElm) {
      return;
    }

    const clipId = clipDrag.draggingEl.dataset.value;
    const clipItem = originClipGroupElm.getItemByValue(clipId);

    const mode = clipDrag.mode;
    if (mode === "move") {
      const moveMode = clipDrag.moveMode;
      if (moveMode === "normal") {
        clipItem.clipStart = clipDrag.getState("clipStart");
        clipItem.rowIndex = clipDrag.getState("rowIndex");

        originClipGroupElm.normalizeClipEdges(clipItem, mode);

        if (originTrackId === targetTrackId) {
          originClipGroupElm.updateClip(clipItem);
        } else {
          originClipGroupElm.removeClip(clipId, {
            shift: false,
          });

          targetClipGroupElm.addClip(clipItem);
          targetClipGroupElm.selectedClipId = clipId;
        }
      }

      if (moveMode === "insert") {
        const clipStart = clipDrag.getState("clipStart");
        const rowIndex = clipDrag.getState("rowIndex");

        const oldClipItem = { ...clipItem };

        const newClipItem = {
          ...clipItem,
          clipStart: clipStart,
          rowIndex: rowIndex,
        };

        if (!targetClipGroupElm.isInsertPointAvailable(clipStart, rowIndex)) {
          return;
        }

        clipDrag.draggingEl.style.visibility = "hidden";

        if (
          targetTrackId === originTrackId &&
          rowIndex === oldClipItem.rowIndex &&
          clipStart > oldClipItem.clipStart
        ) {
          originClipGroupElm.shiftClipsForRemove(oldClipItem);
          const duration = oldClipItem.trimEnd - oldClipItem.trimStart;
          newClipItem.clipStart -= duration;
          targetClipGroupElm.shiftClipsForInsert(newClipItem);
        } else {
          originClipGroupElm.shiftClipsForRemove(oldClipItem);
          targetClipGroupElm.shiftClipsForInsert(newClipItem);
        }

        if (targetTrackId === originTrackId) {
          targetClipGroupElm.updateClip(newClipItem, {
            resolveRow: false,
          });

          clipDrag.draggingEl.style.visibility = "";
        } else {
          originClipGroupElm.removeClip(clipId, {
            shift: false,
          });

          targetClipGroupElm.addClip(newClipItem, {
            resolveRow: false,
          });

          targetClipGroupElm.selectedClipId = clipId;
        }
      }
    }

    if (mode === "dragging-start") {
      const clipStart = clipDrag.getState("clipStart");
      const oldClipStart = clipItem.clipStart;
      const deltaTime = clipStart - oldClipStart;

      clipItem.clipStart = clipStart;
      clipItem.trimStart += deltaTime;

      originClipGroupElm.normalizeClipEdges(clipItem, mode);
      originClipGroupElm.updateClip(clipItem);
    }

    if (mode === "dragging-end") {
      const clipEnd = clipDrag.getState("clipEnd");

      clipItem.trimEnd = clipItem.trimStart + (clipEnd - clipItem.clipStart);

      originClipGroupElm.normalizeClipEdges(clipItem, mode);
      originClipGroupElm.updateClip(clipItem);
    }
  }
}
