import { toast, safeRun, on, getElement } from "./helper.js";

import { Slider } from "../component/slider.js";
import { TimelineRuler } from "../component/timeline/ruler.js";
import { TrackHeaderList } from "../component/timeline/track-header-list.js";
import { TrackList } from "../component/timeline/track-list.js";

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const addTrackBtn = getElement("#add-track");
const addClipBtn = getElement("#add-clip");

const timelineEl = getElement(".timeline");
const timelineHeaderEl = getElement(".timeline-header");
const timelineBodyEl = getElement(".timeline-body");
const timelineCursorEl = getElement(".timeline-cursor");
const timelineCursorLabelEl = getElement(".timeline-cursor-label");

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
const zoomElm = new Slider("#zoom", {
  percentBase: 50,
  min: 5,
  max: 250,
  step: 1,
  value: 50,
  suffix: "%",
  primaryColor: "#787878",
});

const rulerElm = new TimelineRuler("#ruler", {
  interactionElement: timelineBodyEl,
});

const trackHeaderListElm = new TrackHeaderList("#track-header", {
  valueField: "trackId",
  trackHeight: 120,
});
const trackListElm = new TrackList("#track", {
  valueField: "trackId",
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  width: rulerElm.width,
  trackHeight: 120,
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

  on(timelineBodyEl, "scroll", timelineBodyScroll);

  on(rulerElm, "pointerTimeChange", rulerMousemove);
  on(rulerElm, "pixelsPerSecondChange", rulerPixelsPerSecondChange);
  on(rulerElm, "widthChange", rulerWidthChange);

  on(addTrackBtn, "click", addTrack);
  on(addClipBtn, "click", addClip);

  on(trackHeaderListElm, "selectedChange", trackHeaderListSelectedChange);
  on(trackListElm, "selectedChange", trackListSelectedChange);
  on(trackListElm, "durationChange", trackListDurationChange);
}

async function initData() {
  // trackListElm.timelineRuler = rulerElm;
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

function zoomChange({ value }) {
  rulerElm.pixelsPerSecond = value;
}

function timelineBodyScroll() {
  timelineHeaderEl.scrollLeft = timelineBodyEl.scrollLeft;
}

function rulerMousemove({ x, seconds,formatSeconds }) {
  timelineCursorEl.style.left = `${Math.round(x)}px`;
  timelineCursorLabelEl.textContent = `${formatSeconds}`;
}

function rulerPixelsPerSecondChange({ pixelsPerSecond }) {
  trackListElm.pixelsPerSecond = pixelsPerSecond;
}

function rulerWidthChange({ width }) {
  trackListElm.width = width;
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
    audioEnd: 20,
    trimStart: 0,
    trimEnd: 20,
    clipStart: 10,
  };
}
