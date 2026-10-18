import { setThemeMode } from "./theme.js";

import {
  toast,
  safeRun,
  on,
  resolveElement,
  xToTime,
  createElementByHTML,
} from "./helper.js";

import { audioApi } from "../api/audio.api.js";

import { AudioCache } from "../component/timeline/audio-cache.js";
import { TimelineRuler } from "../component/timeline/ruler.js";
import { TrackHeaderList } from "../component/timeline/track-header-list.js";
import { TrackList } from "../component/timeline/track-list.js";
import { TimelinePlayhead } from "../component/timeline/playhead.js";
import { TimelineCursor } from "../component/timeline/cursor.js";
import { Timelet } from "../component/timelet.js";
import { Tumbler } from "../component/tumbler.js";
import { DragDelegate } from "../component/drag.js";

setThemeMode("light");

const SNAP_THRESHOLD = 5;

const STUDIO_AUDIO_PATHS_KEY = "studioAudioPaths";
const audioMap = new Map();

const AUDIO_LIST_ITEM_TEMPLATE = `
<div class="audio">
  <div class="audio-content"></div>
  <button class="audio-remove icon-button" title="移除">×</button>
</div>
`;

const audioListItemTemplate = createElementByHTML(AUDIO_LIST_ITEM_TEMPLATE);

let timelineContainerPointerX = 0;
let timelineContainerPointerSeconds = 0;

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const audioListEl = resolveElement(".audio-list");
const addTrackBtn = resolveElement("#track-add");
const removeTrackBtn = resolveElement("#track-remove");
const splitClipBtn = resolveElement("#clip-split");
const removeClipBtn = resolveElement("#clip-remove");
const duplicateClipBtn = resolveElement("#clip-duplicate");

const timelineHeaderEl = resolveElement(".timeline-header");
const timelineEl = resolveElement(".timeline");
const timelineContentEl = resolveElement(".timeline-content");

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
const audioDrag = new DragDelegate(audioListEl, ".audio", {
  ignoreSelector: ".audio-remove",
});

const audioContext = new AudioContext();

const audioCache = new AudioCache({
  audioContext,
  fetchUrl: "/audio/api/load-audio-data",
});

const zoomElm = new Tumbler("#zoom", {
  rootClass: "tumbler xs",
  percentBase: 50,
  min: 5,
  max: 250,
  step: 1,
  value: 50,
  wheelReverse: true,
  pixelsPerStep: 10,
  wheelPixelsPerStep: 30,
  suffix: "%",
});

const rulerElm = new TimelineRuler("#ruler", {
  timelineElement: timelineEl,
  paddingLeft: 4,
  paddingRight: 4,
});

const trackHeaderListElm = new TrackHeaderList("#track-header-list", {
  valueField: "trackId",
});

const trackListElm = new TrackList("#track-list", {
  valueField: "trackId",
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  trackWidth: rulerElm.width,
  audioCache: audioCache,
});

const timelinePlayheadElm = new TimelinePlayhead("#playhead", {
  timelineElement: timelineEl,
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  time: 0,
  marginLeft: 4,
  marginRight: 4,
});

const timelineCursorElm = new TimelineCursor("#timeline-cursor", {
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  time: 0,
  marginLeft: 4,
  marginRight: 4,
});

const cursorTimeletElm = new Timelet("#cursor-timelet", {
  rootClassExtra: "xs",
  full: true,
  seconds: 0,
  prefix: "C",
});

const playheadTimeletElm = new Timelet("#playhead-timelet", {
  rootClassExtra: "xs",
  full: true,
  seconds: 0,
  prefix: "P",
});

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

safeRun(initializePage);

function initializePage() {
  bindEvents();
  initData();
}

function bindEvents() {
  // audios drag events
  on(window, "storage", localStorageChange);
  on(audioDrag, "pointerDown", audioDragPointerDown);
  on(audioDrag, "pointerMove", audioDragPointerMove);
  on(audioDrag, "pointerUp", audioDragPointerUp);

  on(zoomElm, "change", zoomChange);

  on(timelineEl, "scroll", timelineScroll);
  on(timelineEl, "resizeElement", timelineResize);
  on(timelineContentEl, "dblclick", timelineContentDoubleClick);
  on(timelineContentEl, "pointermove", timelineContentPointerMove);

  on(rulerElm, "pixelsPerSecondChange", rulerPixelsPerSecondChange);
  on(rulerElm, "widthChange", rulerWidthChange);

  on("#toggle-audios", "click", toggleAudios);
  on(addTrackBtn, "click", addTrack);
  on(removeTrackBtn, "click", removeTrack);
  on(splitClipBtn, "click", splitClip);
  on(removeClipBtn, "click", removeClip);
  on(duplicateClipBtn, "click", duplicateClip);

  on(trackHeaderListElm, "selectedChange", trackHeaderListSelectedChange);
  on(trackListElm, "selectedChange", trackListSelectedChange);
  on(trackListElm, "durationChange", trackListDurationChange);
  on(trackListElm, "trackHeightChange", trackListTrackHeightChange);

  on(timelinePlayheadElm, "timeChange", timelinePlayheadTimeChange);
  on(timelineCursorElm, "timeChange", timelineCursorTimeChange);
}

async function initData() {
  addTrack();

  await listStoredAudios();
  if (audioMap.size > 0) {
    audioListEl.classList.add("open");
  } else {
    audioListEl.classList.remove("open");
  }
}

// -----------------------------------------------------------------------------
// Studio Audios events
// -----------------------------------------------------------------------------

function localStorageChange(event) {
  if (event.storageArea !== localStorage) {
    return;
  }

  if (event.key !== STUDIO_AUDIO_PATHS_KEY) {
    return;
  }

  listStoredAudios();
}

async function listStoredAudios() {
  const storedAudioPaths = getLocalStorage(STUDIO_AUDIO_PATHS_KEY) || [];

  if (storedAudioPaths.length === 0) {
    audioMap.clear();
    renderStudioAudios([]);
    return;
  }

  const studioAudios = await audioApi.listStudioAudios(storedAudioPaths);

  audioMap.clear();
  for (const audio of studioAudios) {
    audioMap.set(audio.audioPath, audio);
  }

  renderStudioAudios(Array.from(audioMap.values()));
}

function renderStudioAudios(studioAudios) {
  audioListEl.innerHTML = "";

  for (const audio of studioAudios) {
    const itemEl = audioListItemTemplate.cloneNode(true);
    itemEl.dataset.audioPath = audio.audioPath;
    const textEl = itemEl.querySelector(".audio-content");
    textEl.textContent = audio.text;
    textEl.title = audio.text;
    audioListEl.append(itemEl);
  }

  audioListEl.removeEventListener("click", removeStoredAudio);
  audioListEl.addEventListener("click", removeStoredAudio);
}

function removeStoredAudio(event) {
  if (!event.target.classList.contains("audio-remove")) {
    return;
  }

  const audioEl = event.target.closest(".audio");
  const audioPath = audioEl.dataset.audioPath;

  const storedAudioPaths = getLocalStorage(STUDIO_AUDIO_PATHS_KEY) || [];

  const newStoredAudioPaths = storedAudioPaths.filter(
    (item) => item !== audioPath,
  );

  setLocalStorage(STUDIO_AUDIO_PATHS_KEY, newStoredAudioPaths);

  audioMap.delete(audioPath);

  audioEl.remove();
}

function toggleAudios() {
  audioListEl.classList.toggle("open");
}

// -----------------------------------------------------------------------------
// audio dragging events
// -----------------------------------------------------------------------------

function audioDragPointerDown({ draggingEl }) {
  const audioPath = draggingEl.dataset.audioPath;
  const audio = audioMap.get(audioPath);
  audioDrag.setState("audio", audio);

  const snapPoints = getSnapPoints();
  audioDrag.setState("snapPoints", snapPoints);
}

function audioDragPointerMove({
  draggingGhostEl,
  clientX,
  clientY,
  offsetX,
  offsetY,
  isDragging,
}) {
  if (!isDragging) {
    return;
  }

  let ghostLeft = clientX - offsetX;
  let ghostTop = clientY - offsetY;

  const clipGroupElm = trackListElm.getClipGroupAtPoint(clientX, clientY);

  if (clipGroupElm) {
    const clipGroupRect = clipGroupElm.rootElement.getBoundingClientRect();

    const x = ghostLeft - clipGroupRect.left;
    const y = ghostTop - clipGroupRect.top;

    let clipStart = x / rulerElm.pixelsPerSecond;
    clipStart = Math.max(0, clipStart);

    const snapPoints = audioDrag.getState("snapPoints");
    const snap = trySnapTime(clipStart, snapPoints, rulerElm.pixelsPerSecond);
    clipStart = snap.time;
    ghostLeft = clipGroupRect.left + clipStart * rulerElm.pixelsPerSecond;

    const clipTop = clipGroupElm.resolveClipTop(y);
    if (Math.abs(y - clipTop) < SNAP_THRESHOLD) {
      ghostTop = clipGroupRect.top + clipTop;
    }
    ghostTop = Math.max(clipGroupRect.top, ghostTop);
  }

  draggingGhostEl.style.left = `${ghostLeft}px`;
  draggingGhostEl.style.top = `${ghostTop}px`;
}

function audioDragPointerUp({
  isDragging,
  draggingGhostRect,
  clientX,
  clientY,
}) {
  if (!isDragging) {
    return;
  }

  const clipGroupElm = trackListElm.getClipGroupAtPoint(clientX, clientY);
  if (!clipGroupElm) {
    return;
  }

  const audio = audioDrag.getState("audio");
  if (!audio) {
    return;
  }

  const clip = createClipFromAudio(audio);
  clipGroupElm.addClipAtPoint(
    clip,
    draggingGhostRect.left,
    draggingGhostRect.top,
  );
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

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

function zoomChange({ value }) {
  rulerElm.pixelsPerSecond = value;
}

function timelineScroll() {
  timelineHeaderEl.scrollTop = timelineEl.scrollTop;
}

function timelineResize() {
  rulerElm.containerWidth = timelineEl.clientWidth;
}

function timelineContentDoubleClick(event) {
  timelinePlayheadElm.time = timelineContainerPointerSeconds;
}

function timelineContentPointerMove(event) {
  const rect = timelineContentEl.getBoundingClientRect();
  timelineContainerPointerX = event.clientX - rect.left;

  timelineContainerPointerSeconds = xToTime(
    timelineContainerPointerX,
    rulerElm.pixelsPerSecond,
  );
  timelineCursorElm.time = timelineContainerPointerSeconds;
}

function rulerPixelsPerSecondChange({ pixelsPerSecond }) {
  trackListElm.pixelsPerSecond = pixelsPerSecond;
  timelinePlayheadElm.pixelsPerSecond = pixelsPerSecond;
  timelineCursorElm.pixelsPerSecond = pixelsPerSecond;
}

function rulerWidthChange({ width, seconds }) {
  timelineContentEl.style.width = `${width}px`;
  trackListElm.trackWidth = width;

  if (timelinePlayheadElm.time > seconds) {
    timelinePlayheadElm.time = seconds;
  }
}

function addTrack() {
  const newTrack = createDefaultTrack();
  trackListElm.addTrack(newTrack);
  trackHeaderListElm.addTrack(newTrack);

  if (trackListElm.count === 1) {
    trackListElm.selectedValue = newTrack.trackId;
  }
}

function removeTrack() {
  const selectedValue = trackListElm.selectedValue;

  if (selectedValue === null) {
    toast.show("No track selected");
    return;
  }

  const selectedIndex = trackListElm.findItemIndexByValue(selectedValue);

  trackListElm.removeTrack(selectedValue);
  trackHeaderListElm.removeTrack(selectedValue);

  if (trackListElm.isEmpty) {
    addTrack();
  }

  // Select the new track based on the previous selection.
  const lastIndex = trackListElm.count - 1;
  const newSelectedIndex =
    selectedIndex > lastIndex ? lastIndex : selectedIndex;
  const newSelectedValue = trackListElm.getValueByIndex(newSelectedIndex);

  trackListElm.selectedValue = newSelectedValue;

  toast.show("Track removed");
}

function trackHeaderListSelectedChange({ value }) {
  trackListElm.selectedValue = value;
}

function trackListSelectedChange({ value }) {
  trackHeaderListElm.selectedValue = value;
}

function trackListDurationChange({ duration }) {
  rulerElm.duration = duration;
}

function trackListTrackHeightChange({ value, height }) {
  trackHeaderListElm.setTrackHeaderHeight(value, height);
}

function timelinePlayheadTimeChange({ time }) {
  playheadTimeletElm.seconds = time;
  trackListElm.playheadTime = time;
}

function timelineCursorTimeChange({ time }) {
  cursorTimeletElm.seconds = time;
}

function splitClip() {
  const result = trackListElm.splitClip();

  switch (result) {
    case "success":
      toast.show("Clip split");
      break;

    case "clip-not-selected":
      toast.show("No clip selected");
      break;

    case "too-close-to-start":
      toast.show("Playhead is too close to clip start");
      break;

    case "too-close-to-end":
      toast.show("Playhead is too close to clip end");
      break;

    case "clip-not-found":
      toast.show("Selected clip not found");
      break;
  }
}

function removeClip() {
  const result = trackListElm.removeClip();

  switch (result) {
    case "success":
      toast.show("Clip removed");
      break;

    case "clip-not-selected":
      toast.show("No clip selected");
      break;

    case "clip-not-found":
      toast.show("Selected clip not found");
      break;
  }
}

function duplicateClip() {
  const result = trackListElm.duplicateClip();

  switch (result) {
    case "success":
      toast.show("Clip duplicated");
      break;

    case "clip-not-selected":
      toast.show("No clip selected");
      break;

    case "clip-not-found":
      toast.show("Selected clip not found");
      break;
  }
}

// -----------------------------------------------------------------------------
// Page Logic
// -----------------------------------------------------------------------------

/** localstore */

function getLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}
function setLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** snap points */

function getSnapPoints() {
  return [
    ...trackListElm.snapPoints,
    {
      time: timelinePlayheadElm.time,
      type: "playhead",
    },
  ];
}

function trySnapTime(
  time,
  snapPoints,
  pixelsPerSecond,
  threshold = SNAP_THRESHOLD,
) {
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

function createDefaultTrack(options = {}) {
  return {
    trackId: crypto.randomUUID(),
    name: "",
    gain: 1,
    pan: 0,
    locked: false,
    muted: false,
  };
}
