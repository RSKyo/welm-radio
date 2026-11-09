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
  const audioDrag = new DragDelegate(
    audioListEl,
    ".audio",
    ".clip-row-content",
    {
      ignoreDraggingSelector: ".audio-remove",
    },
  );

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

    const moveMode = audioDrag.moveMode;
    if (moveMode === "normal") {
      const draggingGhostInfo = audioDrag.draggingGhostInfo;
      let x1 = draggingGhostInfo.x1;
      let y1 = draggingGhostInfo.y1;

      if (audioDrag.hasTarget) {
        const clipGroupEl = audioDrag.targetEl.closest(".clip-group");
        const trackId = clipGroupEl.dataset.trackId;

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

        y1 = 0;

        const clipStart = clipGroupElm.resolveTime(x1);
        audioDrag.setState("clipStart", clipStart);
      }

      audioDrag.dragTo(x1, y1);
    }

    if (moveMode === "insert") {
      const insertGhostInfo = audioDrag.insertGhostInfo;
      let x1 = insertGhostInfo.x1;
      let y1 = insertGhostInfo.y1;

      if (audioDrag.hasTarget) {
        const clipGroupEl = audioDrag.targetEl.closest(".clip-group");
        const trackId = clipGroupEl.dataset.trackId;

        const clipGroupElm = trackListElm.getClipGroup(trackId);

        if (!event.shiftKey) {
          const snapPoints = audioDrag.getState("snapPoints");
          const snap = trySnapTime(
            clipGroupElm.resolveTime(x1),
            snapPoints,
            clipGroupElm.snapThreshold,
          );
          x1 = snap.time * clipGroupElm.pixelsPerSecond;
        }

        y1 = 0;

        const clipStart = clipGroupElm.resolveTime(x1);
        audioDrag.setState("clipStart", clipStart);
      }

      audioDrag.insertTo(x1, y1);
    }
  }

  /** pointer up handler */

  function pointerUp() {
    if (!audioDrag.isDragging) {
      return;
    }

    if (!audioDrag.hasTarget) {
      return;
    }

    const audio = audioDrag.getState("audio");
    if (!audio) {
      return;
    }

    const rowEl = audioDrag.targetEl.closest(".clip-row");
    const rowIndex = Number(rowEl.dataset.rowIndex);

    const clipGroupEl = audioDrag.targetEl.closest(".clip-group");
    const trackId = clipGroupEl.dataset.trackId;

    const clipGroupElm = trackListElm.getClipGroup(trackId);

    const clipStart = audioDrag.getState("clipStart");

    const clipItem = createClipItemFromAudio(audio);
    clipItem.clipStart = clipStart;
    clipItem.rowIndex = rowIndex;

    const moveMode = audioDrag.moveMode;

    if (moveMode === "normal") {
      clipGroupElm.addClip(clipItem);
      clipGroupElm.selectedClipId = clipItem.clipId;
      return;
    }

    if (moveMode === "insert") {
      if (!clipGroupElm.isInsertPointAvailable(clipStart, rowIndex)) {
        return;
      }

      clipGroupElm.shiftClipsForInsert(clipItem);

      clipGroupElm.addClip(clipItem, {
        resolveRow: false,
      });
      clipGroupElm.selectedClipId = clipItem.clipId;
      return;
    }
  }

  /** methods */

  function createClipItemFromAudio(audio) {
    return {
      clipId: crypto.randomUUID(),
      title: "xxx",
      type: audio.meta.type,
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
