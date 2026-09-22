import { toast, safeRun, on, getElement } from "./helper.js";

import { Slider } from "../component/slider.js";
import { TimelineRuler } from "../component/timeline-ruler.js";
import { TimelineTrackHeaderList } from "../component/timeline-track-header-list.js";
import { TimelineTrackList } from "../component/timeline-track-list.js";

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const addTrackBtn = getElement("#add-track");

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
});

const rulerElm = new TimelineRuler("#ruler",{
  interactionElement: timelineBodyEl,
});

const trackHeaderElm = new TimelineTrackHeaderList("#track-header", {
  valueField: "id",
  height: 120,
});
const trackElm = new TimelineTrackList("#track", {
  valueField: "id",
  pixelsPerSecond: rulerElm.pixelsPerSecond,
  width: timelineBodyEl.clientWidth,
  height: 120,
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

  on(rulerElm, "pixelsPerSecondChange", rulerPixelsPerSecondChange);
  on(rulerElm, "widthChange", rulerWidthChange);
  on(rulerElm, "mousemove", rulerMousemove);

  

  on(addTrackBtn, "click", addTrack);
  on(trackHeaderElm, "selectedChange", trackHeaderSelectedChange);
  on(trackElm, "selectedChange",trackSelectedChange);
}

async function initData() {
  // trackElm.timelineRuler = rulerElm;
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


function rulerPixelsPerSecondChange({ pixelsPerSecond }) {
  trackElm.pixelsPerSecond = pixelsPerSecond;
}

function rulerWidthChange({ width }) {
  trackElm.width = width;
}

function rulerMousemove({ x, formatSeconds }) {
  timelineCursorEl.style.left = `${Math.round(x)}px`;
  timelineCursorLabelEl.textContent = `${formatSeconds}`;
}



function addTrack() {
  const newTrack = createDefaultTrack();
  trackElm.addItem(newTrack,"track item");
  trackHeaderElm.addItem(newTrack,"track header item");
}

function trackHeaderSelectedChange({value}){
  trackElm.selectedValue = value;
}

function trackSelectedChange({value}) {
  trackHeaderElm.selectedValue = value;
}

// -----------------------------------------------------------------------------
// Page Logic
// -----------------------------------------------------------------------------
function createDefaultTrack(options = {}) {
  return {
    id: crypto.randomUUID(),
    name: "",
    gain: 1,
    locked: false,
    muted: false,
    pan: 0,
    description: "",
  };
}
