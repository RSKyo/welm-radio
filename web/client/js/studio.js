import { setThemeMode } from "./theme.js";

import { toast, safeRun, on, resolveElement, xToTime } from "./helper.js";

import { CompactSlider } from "../component/slider.js";
import { TimelineRuler } from "../component/timeline/ruler.js";
import { TrackHeaderList } from "../component/timeline/track-header-list.js";
import { TrackList } from "../component/timeline/track-list.js";
import { TimelinePlayhead } from "../component/timeline/playhead.js";
import { TimelineCursor } from "../component/timeline/cursor.js";
import { Timelet } from "../component/timelet.js";

setThemeMode("light");

let timelineContainerPointerX = 0;
let timelineContainerPointerSeconds = 0;
// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const addTrackBtn = resolveElement("#add-track");
const addClipBtn = resolveElement("#add-clip");

const timelineHeaderEl = resolveElement(".timeline-header");
const timelineEl = resolveElement(".timeline");
const timelineContentEl = resolveElement(".timeline-content");

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
const zoomElm = new CompactSlider("#zoom", {
  percentBase: 50,
  min: 5,
  max: 250,
  step: 1,
  value: 50,
  suffix: "%",
  label: "Zoom",
});

const rulerElm = new TimelineRuler("#ruler", {
  timelineElement: timelineEl,
  paddingLeft: 4,
  paddingRight: 4,
});

const trackHeaderListElm = new TrackHeaderList("#track-header-list", {
  valueField: "trackId",
  trackHeight: 120,
});

const trackListElm = new TrackList("#track-list", {
  valueField: "trackId",
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  trackWidth: rulerElm.width,
  trackHeight: 120,
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
  full: true,
  seconds: 0,
  color: "var(--color-primary-text)",
  fontSize: "10px",
  prefix: "C",
});

const playheadTimeletElm = new Timelet("#playhead-timelet", {
  full: true,
  seconds: 0,
  color: "var(--color-primary-text)",
  fontSize: "10px",
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

  // on(rulerElm, "timelinePointerChange", rulerTimelinePointerChange);
  on(rulerElm, "pixelsPerSecondChange", rulerPixelsPerSecondChange);
  on(rulerElm, "widthChange", rulerWidthChange);

  on(addTrackBtn, "click", addTrack);
  on(addClipBtn, "click", addClip);

  on(trackHeaderListElm, "selectedChange", trackHeaderListSelectedChange);
  on(trackListElm, "selectedChange", trackListSelectedChange);
  on(trackListElm, "durationChange", trackListDurationChange);
  on(trackListElm, "trackHeightChange", trackListTrackHeightChange);

  on(timelinePlayheadElm, "timeChange", timelinePlayheadTimeChange);
  on(timelineCursorElm, "timeChange", timelineCursorTimeChange);
}

async function initData() {
  addTrack();
  // trackListElm.timelineRuler = rulerElm;
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
  trackListElm.addItem(newTrack, "track item");
  trackHeaderListElm.addItem(newTrack, "track header item");
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
  const trackValue = trackListElm.selectedValue;
  if (trackValue === null) return;

  const newClip = createDefaultClip();
  trackListElm.addClip(trackValue, newClip);
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
    audioStart: 0,
    audioEnd: 10,
    trimStart: 0,
    trimEnd: 10,
    clipStart: 2,
    rowIndex: 0,
  };
}
