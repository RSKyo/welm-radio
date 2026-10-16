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

setThemeMode("light");

const STUDIO_AUDIO_PATHS_KEY = "studioAudioPaths";
const audioMap = new Map();

const AUDIO_LIST_ITEM_TEMPLATE = `
<div class="audio-list-item">
  <span class="audio-list-item-text"></span>
  <button class="audio-list-item-remove icon-button" title="移除">×</button>
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
const addClipBtn = resolveElement("#clip-add");
const splitClipBtn = resolveElement("#clip-split");
const removeClipBtn = resolveElement("#clip-remove");
const duplicateClipBtn = resolveElement("#clip-duplicate");

const timelineHeaderEl = resolveElement(".timeline-header");
const timelineEl = resolveElement(".timeline");
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
  on(zoomElm, "change", zoomChange);

  on(timelineEl, "scroll", timelineScroll);
  on(timelineEl, "resizeElement", timelineResize);
  on(timelineContentEl, "dblclick", timelineContentDoubleClick);
  on(timelineContentEl, "pointermove", timelineContentPointerMove);

  on(rulerElm, "pixelsPerSecondChange", rulerPixelsPerSecondChange);
  on(rulerElm, "widthChange", rulerWidthChange);

  on(window, "storage", localStorageChange);
  on("#toggle-audios", "click", toggleAudios);
  on(addTrackBtn, "click", addTrack);
  on(removeTrackBtn, "click", removeTrack);
  on(addClipBtn, "click", addClip);
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
  if (studioAudios.length > 0) {
    audioListEl.classList.add("open");
  } else {
    audioListEl.classList.remove("open");
  }
}

// -----------------------------------------------------------------------------
// Studio Audios
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
  const storedAudioPaths =
    JSON.parse(localStorage.getItem(STUDIO_AUDIO_PATHS_KEY)) || [];

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

  renderStudioAudios();
}

function renderStudioAudios() {
  audioListEl.innerHTML = "";

  for (const audio of audioMap.values()) {
    const itemEl = audioListItemTemplate.cloneNode(true);
    itemEl.dataset.audioPath = audio.audioPath;
    const textEl = itemEl.querySelector(".audio-list-item-text");
    textEl.textContent = audio.text;
    textEl.title = audio.text;
    audioListEl.append(itemEl);
  }

  audioListEl.removeEventListener("click", removeStoredAudio);
  audioListEl.addEventListener("click", removeStoredAudio);
}

function removeStoredAudio(event) {
  if (!event.target.classList.contains("audio-list-item-remove")) {
    return;
  }

  const itemEl = event.target.closest(".audio-list-item");
  const audioPath = itemEl.dataset.audioPath;

  const storedAudioPaths =
    JSON.parse(localStorage.getItem(STUDIO_AUDIO_PATHS_KEY)) || [];

  const newStoredAudioPaths = storedAudioPaths.filter(
    (item) => item !== audioPath,
  );

  localStorage.setItem(
    STUDIO_AUDIO_PATHS_KEY,
    JSON.stringify(newStoredAudioPaths),
  );

  audioMap.delete(audioPath);

  itemEl.remove();
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

function addClip() {
  const newClip = createDefaultClip();
  const result = trackListElm.addClip(newClip);

  switch (result) {
    case "success":
      toast.show("Clip added");
      break;

    case "track-not-selected":
      toast.show("No track selected");
      break;

    case "track-not-found":
      toast.show("Selected track not found");
      break;
  }
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

function createDefaultClip(options = {}) {
  return {
    clipId: crypto.randomUUID(),
    title: "",
    audioStart: 15.5,
    audioEnd: 100,
    trimStart: 15.5,
    trimEnd: 100,
    clipStart: 2,
    rowIndex: 0,
    audioMeta: {
      audioPath:
        "/Users/zzz/Music/Audio Library/21a7cc07-a75a-48fe-b3c1-bffa27e4db23.mp3",
      metaPath:
        "/Users/zzz/Music/Audio Library/21a7cc07-a75a-48fe-b3c1-bffa27e4db23.meta.json",
      title: "✂️ Independence from You — 너로부터 독립하다",
      extension: ".mp3",
      language: "zh",
      type: "",
      position: "",
      dayPart: [],
      category: [],
      cutPoints: [],
      content: "",
      alternateGroup: "",
      duration: 120.532,
      start: 15.5,
      end: 100,
      createdAt: "2026-08-16T05:20:17.956Z",
      updatedAt: "2026-08-16T05:20:17.956Z",
    },
  };
}
