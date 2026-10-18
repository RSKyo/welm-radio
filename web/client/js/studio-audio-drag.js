import { on } from "./helper.js";
import { DragDelegate } from "../component/drag.js";

export function setup({
  audioListEl,
  audioMap,
  trackListElm,
  timelinePlayheadElm,
  rulerElm,
} = {}) {
  const audioDrag = new DragDelegate(audioListEl, ".audio", {
    ignoreSelector: ".audio-remove",
    targetSelector: ".clip-group",
  });

  on(audioDrag, "pointerDown", audioDragPointerDown);
  on(audioDrag, "pointerMove", audioDragPointerMove);
  on(audioDrag, "pointerUp", audioDragPointerUp);

  function audioDragPointerDown({ dragging }) {
    const audioPath = dragging.dataset.audioPath;
    const audio = audioMap.get(audioPath);
    audioDrag.setState("audio", audio);

    const snapPoints = getSnapPoints();
    audioDrag.setState("snapPoints", snapPoints);
  }

  function audioDragPointerMove({
    draggingGhost,
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

      const targetLocalGhostLeft = targetLocalX - offsetX;
      const targetLocalGhostTop = targetLocalY - offsetY;

      const { clipStart, top, snapThreshold } =
        clipGroupElm.resolveClipPosition(
          targetLocalGhostLeft,
          targetLocalGhostTop,
        );

      const snapPoints = audioDrag.getState("snapPoints");
      const snap = trySnapTime(
        clipStart,
        snapPoints,
        rulerElm.pixelsPerSecond,
        snapThreshold,
      );

      ghostLeft = targetLeft + snap.time * rulerElm.pixelsPerSecond;
      ghostTop = targetTop + top;
    }

    draggingGhost.style.left = `${ghostLeft}px`;
    draggingGhost.style.top = `${ghostTop}px`;
  }

  function audioDragPointerUp({
    isDragging,
    draggingGhostLeft,
    draggingGhostTop,
    target,
  }) {
    if (!isDragging) {
      return;
    }

    if (!target) {
      return;
    }

    const trackId = target.dataset.trackId;
    const clipGroupElm = trackListElm.getClipGroup(trackId);
    if (!clipGroupElm) {
      return;
    }

    const audio = audioDrag.getState("audio");
    if (!audio) {
      return;
    }

    const clip = createClipFromAudio(audio);
    clipGroupElm.addClipAtPoint(clip, draggingGhostLeft, draggingGhostTop);
  }

  function createClipFromAudio(audio) {
    return {
      clipId: crypto.randomUUID(),
      title: "",
      audioStart: audio.meta.start,
      audioEnd: audio.meta.end,
      trimStart: audio.meta.start,
      trimEnd: audio.meta.end,
      clipStart: 2,
      rowIndex: 0,
      audioMeta: { ...audio.meta },
    };
  }

  function getSnapPoints() {
    return [
      ...trackListElm.snapPoints,
      {
        time: timelinePlayheadElm.time,
        type: "playhead",
      },
    ];
  }

  function trySnapTime(time, snapPoints, pixelsPerSecond, threshold = 5) {
    let snappedTime = time;
    let snappedPoint = null;
    let minDistance = threshold;

    for (const snapPoint of snapPoints) {
      const distance = Math.abs(time - snapPoint.time) * pixelsPerSecond;

      if (distance < minDistance) {
        minDistance = distance;
        snappedTime = snapPoint.time;
        snappedPoint = snapPoint;
      }
    }

    return {
      time: snappedTime,
      snapPoint: snappedPoint,
    };
  }
}
