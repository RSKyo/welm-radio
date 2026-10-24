import { setThemeMode } from "./theme.js";

import { toast, safeRun, on, resolveElement, xToTime } from "./helper.js";

import { audioApi } from "../api/audio.api.js";

import { AudioCache } from "../component/timeline/audio-cache.js";
import { TimelineRuler } from "../component/timeline/ruler.js";
import { TrackList } from "../component/timeline/track-list.js";
import { TimelinePlayhead } from "../component/timeline/playhead.js";
import { TimelineCursor } from "../component/timeline/cursor.js";
import { Timelet } from "../component/timelet.js";
import { Tumbler } from "../component/tumbler.js";

import * as studioAudioList from "./studio-audio-list.js";
import * as studioAudioDrag from "./studio-audio-drag.js";
import * as studioClipDrag from "./studio-clip-drag.js";

setThemeMode("light");

const audioMap = new Map();

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

// const timelineEl = resolveElement(".timeline");
const timelineHeaderEl = resolveElement(".timeline-header");
const timelineContentEl = resolveElement(".timeline-content");

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

const audioContext = new AudioContext();

const audioCache = new AudioCache({
  audioContext,
  fetchUrl: "/audio/api/load-audio-data",
});

const zoomElm = new Tumbler("#zoom", {
  rootClass: "tumbler xs",
  percentBase: 5,
  min: 5,
  max: 50,
  step: 1,
  value: 5,
  wheelReverse: true,
  pixelsPerStep: 10,
  wheelPixelsPerStep: 30,
  suffix: "%",
});

const rulerElm = new TimelineRuler("#ruler", {
  basePixelsPerInterval: 100,
  baseTimeUnit: 0.005,
  baseZoom: 100,
  minZoom: 100,
  maxZoom: 1000,
  basePixelsPerSecond: 5,
});

const trackListElm = new TrackList("#track-list", {
  valueField: "trackId",
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  trackWidth: rulerElm.width,
  audioCache: audioCache,
});

const timelinePlayheadElm = new TimelinePlayhead("#playhead", {
  // timelineElement: timelineEl,
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  time: 0,
});

const timelineCursorElm = new TimelineCursor("#timeline-cursor", {
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  time: 0,
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

async function initializePage() {
  await studioAudioList.setup({
    audioMap,
    audioListEl,
  });

  studioAudioDrag.setup({
    audioListEl,
    audioMap,
    trackListElm,
    getSnapPoints: getSnapPoints,
    trySnapTime: trySnapTime,
  });

  studioClipDrag.setup({
    trackListElm,
    getSnapPoints: getSnapPoints,
    trySnapTime: trySnapTime,
  });

  bindEvents();
  initData();
}

function bindEvents() {
  // audios drag events

  on(zoomElm, "change", zoomChange);

    // on(timelineContentEl, "dblclick", timelineContentDoubleClick);
    // on(timelineContentEl, "pointermove", timelineContentPointerMove);

  on(rulerElm, "pixelsPerSecondChange", rulerPixelsPerSecondChange);
  on(rulerElm, "widthChange", rulerWidthChange);

  on("#toggle-audios", "click", toggleAudios);
  on(addTrackBtn, "click", addTrack);
  on(removeTrackBtn, "click", removeTrack);
  on(splitClipBtn, "click", splitClip);
  on(removeClipBtn, "click", removeClip);
  on(duplicateClipBtn, "click", duplicateClip);

  on(timelineContentEl, "scroll", timelineContentScroll);

  on(trackListElm, "durationChange", trackListDurationChange);

  on(timelinePlayheadElm, "timeChange", timelinePlayheadTimeChange);
  on(timelineCursorElm, "timeChange", timelineCursorTimeChange);
}

async function initData() {
  addTrack();

  if (audioMap.size > 0) {
    audioListEl.classList.toggle("open");
  } else {
    audioListEl.classList.remove("open");
  }
}

function toggleAudios() {
  audioListEl.classList.toggle("open");
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

function zoomChange({ value }) {
  rulerElm.pixelsPerSecond = value;
}

// function timelineContentDoubleClick(event) {
//   timelinePlayheadElm.time = timelineContainerPointerSeconds;
// // }

// function timelineContentPointerMove(event) {
//   const rect = timelineContentEl.getBoundingClientRect();
//   timelineContainerPointerX = event.clientX - rect.left;

//   timelineContainerPointerSeconds = xToTime(
//     timelineContainerPointerX,
//     rulerElm.pixelsPerSecond,
//   );
//   timelineCursorElm.time = timelineContainerPointerSeconds;
// }

function timelineContentScroll(event) {
  const scrollLeft = timelineContentEl.scrollLeft;
  timelineHeaderEl.scrollLeft = scrollLeft;
}

function rulerPixelsPerSecondChange({ pixelsPerSecond }) {
  trackListElm.pixelsPerSecond = pixelsPerSecond;
  timelinePlayheadElm.pixelsPerSecond = pixelsPerSecond;
  timelineCursorElm.pixelsPerSecond = pixelsPerSecond;
}

function rulerWidthChange({ width, seconds }) {
  trackListElm.width = width;

  if (timelinePlayheadElm.time > seconds) {
    timelinePlayheadElm.time = seconds;
  }
}

function addTrack() {
  const newTrack = createDefaultTrack();
  trackListElm.addTrack(newTrack);

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

function trackListDurationChange({ duration }) {
  rulerElm.duration = duration;
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
