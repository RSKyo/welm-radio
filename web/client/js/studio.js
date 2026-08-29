import { toast, safeRun, on } from "./helper.js";

import { Slider } from "../component/slider.js";
import { TimelineRuler } from "../component/timeline-ruler.js";

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const timelineBodyEl = document.querySelector(".timeline-body");
const timelineCursorEl = document.querySelector(".timeline-cursor");
const timelineCursorLabelEl = timelineCursorEl.querySelector(
  ".timeline-cursor-label",
);

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
const timelineZoomSlider = new Slider("#timeline-zoom", {
  suffix: "px",
  base: 50,
  min: 5,
  max: 250,
  step: 1,
  value: 50,
});
// const timelineZoomSlider = new Slider("#timeline-zoom",{suffix: "px"});
const timelineRulerElm = new TimelineRuler("#timeline-ruler");

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
  on.change(timelineZoomSlider, ({ value }) => {
    timelineRulerElm.pixelsPerSecond = value;
  });
}

async function initData() {}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------
on.mousemove(timelineRulerElm.rootElement, updateTimelineCursor);
on.mousemove(timelineBodyEl, updateTimelineCursor);


// -----------------------------------------------------------------------------
// Page Logic
// -----------------------------------------------------------------------------

function updateTimelineCursor(event) {
  const rect = timelineBodyEl.getBoundingClientRect();

  let x = event.clientX - rect.left + timelineBodyEl.scrollLeft;
  x = Math.max(x, 0);
  
  timelineCursorEl.style.left = `${x}px`;
  const seconds = timelineRulerElm.xToTime(x);
  timelineCursorLabelEl.textContent = `${seconds}s`;
}
