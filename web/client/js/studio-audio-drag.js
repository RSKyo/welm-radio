import { on } from "./helper.js";
import { DragDelegate } from "../component/drag.js";

export function setup({
  audioListEl,
  audioMap,
  trackListElm,
  getSnapPoints,
  trySnapTime,
} = {}) {
  const audioDrag = new DragDelegate(audioListEl, ".audio", ".clip-group", {
    ignoreDraggingSelector: ".audio-remove",
  });

  on(audioDrag, "pointerDown", pointerDown);
  on(audioDrag, "pointerMove", pointerMove);
  on(audioDrag, "pointerUp", pointerUp);

  function pointerDown() {
    const draggingEl = audioDrag.dragging.element;
    const audioPath = draggingEl.dataset.audioPath;
    const audio = audioMap.get(audioPath);
    audioDrag.setState("audio", audio);

    const snapPoints = getSnapPoints();
    audioDrag.setState("snapPoints", snapPoints);
  }

  function pointerMove() {
    if (!audioDrag.isDragging) {
      return;
    }

    const draggingGhost = audioDrag.draggingGhost;
    let x = draggingGhost.x1;
    let y = draggingGhost.y1;

    const target = audioDrag.target;
    if (target) {
      const trackId = target.element.dataset.trackId;
      const clipGroupElm = trackListElm.getClipGroup(trackId);
      if (!clipGroupElm) {
        return;
      }

      const ghostLeft = x - target.x1;
      const ghostTop = y - target.y1;

      const { time, rowIndex, top, snapThreshold } =
        clipGroupElm.resolvePosition(ghostLeft, ghostTop);

      const snapPoints = audioDrag.getState("snapPoints");
      const snap = trySnapTime(
        time,
        snapPoints,
        clipGroupElm.pixelsPerSecond,
        snapThreshold,
      );

      x = target.x1 + snap.time * clipGroupElm.pixelsPerSecond;
      y = target.y1 + top;

      audioDrag.setState("clipStart", snap.time);
      audioDrag.setState("rowIndex", rowIndex);
    }

    audioDrag.dragTo(x, y);
  }

  function pointerUp() {
    if (!audioDrag.isDragging) {
      return;
    }

    const target = audioDrag.target;
    if (!target) {
      return;
    }

    const trackId = target.element.dataset.trackId;
    const clipGroupElm = trackListElm.getClipGroup(trackId);
    if (!clipGroupElm) {
      return;
    }

    const audio = audioDrag.getState("audio");
    if (!audio) {
      return;
    }

    const clipStart = audioDrag.getState("clipStart");
    const rowIndex = audioDrag.getState("rowIndex");

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
