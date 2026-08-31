import { toast, safeRun, on, getElement } from "./helper.js";

import { Slider } from "../component/slider.js";
import { TimelineRuler } from "../component/timeline-ruler.js";
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
const sliderElm = new Slider("#timeline-zoom", {
  suffix: "px",
  base: 50,
  min: 5,
  max: 250,
  step: 1,
  value: 50,
});
// const timelineZoomSlider = new Slider("#timeline-zoom",{suffix: "px"});
const timelineRulerElm = new TimelineRuler("#timeline-ruler");
const timelineTrackListElm = new TimelineTrackList("#timeline-track-list",{
  timelineRuler: timelineRulerElm,
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
  on(sliderElm, "change", sliderChange);

  on(timelineEl, "resize", timelineResize);
  on(timelineEl, "mousemove", timelineMousemove);
  on(timelineBodyEl, "scroll", timelineBodyScroll);
  on(timelineRulerElm, "widthChange", timelineRulerWidthChange);
  
  on(addTrackBtn, "click", addTrack);

}

async function initData() {
  timelineTrackListElm.timelineRuler = timelineRulerElm;
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

function sliderChange({ value }) {
  timelineRulerElm.pixelsPerSecond = value;
}

function timelineResize() {
  timelineRulerElm.width = timelineEl.clientWidth;
}

function timelineMousemove(event) {
  const timelineRect = timelineEl.getBoundingClientRect();

  let x = event.clientX - timelineRect.left;
  x = Math.max(x, 0);

  timelineCursorEl.style.left = `${Math.round(x)}px`;
  const seconds = timelineRulerElm.xToTime(x);
  timelineCursorLabelEl.textContent = `${seconds}s`;
}

function timelineBodyScroll() {
  timelineHeaderEl.scrollLeft = timelineBodyEl.scrollLeft;
}

function timelineRulerWidthChange({ width }) {
  timelineTrackListElm.updateWidth(width);
}

function addTrack() {
  const trackName = `Track ${timelineTrackListElm.items.length + 1}`;
  timelineTrackListElm.addItem({
    text: trackName,
    value: trackName,
  });
}



// -----------------------------------------------------------------------------
// Page Logic
// -----------------------------------------------------------------------------
