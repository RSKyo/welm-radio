import { on } from "./helper.js";
import { DragDelegate } from "../component/drag.js";

export function setup({
  audioListEl,
  audioMap,
  trackListElm,
  getSnapPoints,
  trySnapTime,
} = {}) {
  const audioDrag = new DragDelegate(audioListEl, ".audio",".clip-group", {
    ignoreSelector: ".audio-remove",
  });

  on(audioDrag, "pointerDown", pointerDown);
  on(audioDrag, "pointerMove", pointerMove);
  on(audioDrag, "pointerUp", pointerUp);

  function pointerDown({ dragging }) {
    const audioPath = dragging.dataset.audioPath;
    const audio = audioMap.get(audioPath);
    audioDrag.setState("audio", audio);

    const snapPoints = getSnapPoints();
    audioDrag.setState("snapPoints", snapPoints);
  }

  function pointerMove({
    clientX,
    clientY,
    draggingGhost,
    
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

    let ghostX = clientX - draggingGhost.pointer.left;
    let ghostY = clientY - draggingGhost.pointer.top;

    if (target) {
      const trackId = target.element.dataset.trackId;
      const clipGroupElm = trackListElm.getClipGroup(trackId);
      if (!clipGroupElm) {
        return;
      }

      const targetLocalGhostLeft = targetLocalX - offsetX;
      const targetLocalGhostTop = targetLocalY - offsetY;

      const { time:clipStart, top, snapThreshold } =
        clipGroupElm.resolvePosition(
          targetLocalGhostLeft,
          targetLocalGhostTop,
        );

      const snapPoints = audioDrag.getState("snapPoints");
      const snap = trySnapTime(
        clipStart,
        snapPoints,
        clipGroupElm.pixelsPerSecond,
        snapThreshold,
      );

      ghostLeft = targetLeft + snap.time * clipGroupElm.pixelsPerSecond;
      ghostTop = targetTop + top;
    }

    draggingGhost.style.left = `${ghostX}px`;
    draggingGhost.style.top = `${ghostY}px`;
  }

  function pointerUp({
    isDragging,
    draggingGhostLeft,
    draggingGhostTop,
    target,
    targetLeft,
    targetTop,
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

    const targetLocalGhostLeft = draggingGhostLeft - targetLeft;
    const targetLocalGhostTop = draggingGhostTop - targetTop;

    const { time: clipStart, rowIndex } = clipGroupElm.resolvePosition(
      targetLocalGhostLeft,
      targetLocalGhostTop,
    );

    const item = createClipItemFromAudio(audio);
    item.clipStart = clipStart;
    item.rowIndex = rowIndex;

    clipGroupElm.addItem(item);
  }

  function createClipItemFromAudio(audio) {
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
}
