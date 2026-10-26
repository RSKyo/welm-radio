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
  const drag = new DragDelegate(audioListEl, ".audio", ".clip-group", {
    ignoreDraggingSelector: ".audio-remove",
  });

  /** bind events */

  on(drag, "pointerDown", pointerDown);
  on(drag, "pointerMove", pointerMove);
  on(drag, "pointerUp", pointerUp);

  /** pointer down handler */

  function pointerDown() {
    const draggingEl = drag.dragging.element;
    const audioPath = draggingEl.dataset.audioPath;
    const audio = audioMap.get(audioPath);
    drag.setState("audio", audio);

    const snapPoints = getSnapPoints();
    drag.setState("snapPoints", snapPoints);
  }

  /** pointer move handler */

  function pointerMove(event) {
    if (!drag.isDragging) {
      return;
    }

    const draggingGhost = drag.draggingGhost;
    let x = draggingGhost.x1;
    let y = draggingGhost.y1;

    const target = drag.target;
    if (target) {
      const trackId = target.element.dataset.trackId;
      const clipGroupElm = trackListElm.getClipGroup(trackId);
      if (!clipGroupElm) {
        return;
      }

      const ghostLeft = x - target.x1;
      const ghostTop = y - target.y1;

      let time = clipGroupElm.resolveTime(ghostLeft);
      const { rowIndex, top,snapThreshold } = clipGroupElm.resolveRowPosition(ghostTop);

      if (!event.shiftKey) {
        const snapPoints = drag.getState("snapPoints");
        const snap = trySnapTime(
          time,
          snapPoints,
          clipGroupElm.snapThreshold,
        );
        time = snap.time;
      }

      x = target.x1 + time * clipGroupElm.pixelsPerSecond;
      y = target.y1 + top;

      drag.setState("clipStart", time);
      drag.setState("rowIndex", rowIndex);
    }

    drag.dragTo(x, y);
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

    const trackId = target.element.dataset.trackId;
    const clipGroupElm = trackListElm.getClipGroup(trackId);
    if (!clipGroupElm) {
      return;
    }

    const audio = drag.getState("audio");
    if (!audio) {
      return;
    }

    const clipStart = drag.getState("clipStart");
    const rowIndex = drag.getState("rowIndex");

    const item = createClipItemFromAudio(audio);
    item.clipStart = clipStart;
    item.rowIndex = rowIndex;

    clipGroupElm.addItem(item);
  }

  /** methods */

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
