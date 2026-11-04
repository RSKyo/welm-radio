import { on } from "./helper.js";
import { DragDelegate } from "../component/drag.js";

export function setup({
  audioListEl,
  audioMap,
  trackListElm,
  getSnapPoints,
  trySnapTime,
} = {}) {
  // drag delegate component
  const audioDrag = new DragDelegate(audioListEl, ".audio", ".clip-group", {
    ignoreDraggingSelector: ".audio-remove",
  });

  /** bind events */

  on(audioDrag, "pointerDown", pointerDown);
  on(audioDrag, "pointerMove", pointerMove);
  on(audioDrag, "pointerUp", pointerUp);

  /** pointer down handler */

  function pointerDown() {
    const draggingEl = audioDrag.draggingEl;
    const audioPath = draggingEl.dataset.audioPath;
    const audio = audioMap.get(audioPath);
    audioDrag.setState("audio", audio);

    const snapPoints = getSnapPoints();
    audioDrag.setState("snapPoints", snapPoints);
  }

  /** pointer move handler */

  function pointerMove(event) {
    if (!audioDrag.isDragging) {
      return;
    }

    const draggingGhostInfo = audioDrag.draggingGhostInfo;
    let x1 = draggingGhostInfo.x1;
    let y1 = draggingGhostInfo.y1;

    if (audioDrag.hasTarget) {
      const trackId = audioDrag.targetEl.dataset.trackId;
      const clipGroupElm = trackListElm.getClipGroup(trackId);

      if (!event.shiftKey) {
        const snapPoints = audioDrag.getState("snapPoints");
        const snap = trySnapTime(
          clipGroupElm.resolveTime(draggingGhostInfo.x1),
          snapPoints,
          clipGroupElm.snapThreshold,
        );
        x1 = snap.time * clipGroupElm.pixelsPerSecond;
      }

      const { rowIndex, top } = clipGroupElm.resolveRowPosition(y1);
      y1 = top;

      const clipStart = clipGroupElm.resolveTime(x1);
      audioDrag.setState("clipStart", clipStart);
      audioDrag.setState("rowIndex", rowIndex);
    }

    audioDrag.dragTo(x1, y1);
  }

  /** pointer up handler */

  function pointerUp() {
    if (!audioDrag.isDragging) {
      return;
    }

    if (!audioDrag.hasTarget) {
      return;
    }

    const trackId = audioDrag.targetEl.dataset.trackId;
    const clipGroupElm = trackListElm.getClipGroup(trackId);

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
    clipGroupElm.selectedClipId = item.clipId;
  }

  /** methods */

  function createClipItemFromAudio(audio) {
    return {
      clipId: crypto.randomUUID(),
      title: "xxx",
      audioStart: audio.meta.start,
      audioEnd: audio.meta.end,
      trimStart: audio.meta.start,
      trimEnd: audio.meta.end,
      clipStart: 0,
      rowIndex: 0,
      audioMeta: { ...audio.meta },
    };
  }
}
