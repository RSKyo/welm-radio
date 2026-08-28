import { toast, safeRun, on } from "./helper.js";

import { TimelineRuler } from "../component/timeline-ruler.js";


// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const timelineRulerContainer = document.querySelector("#timeline-ruler").parentElement;


// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

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
  
}

async function initData() {
  
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Page Logic
// -----------------------------------------------------------------------------


const volumeSlider =
  document.querySelector('[data-role="volume"]');

let lastVolume = Number(volumeSlider.value);

volumeSlider.addEventListener("input", () => {
  const volume = Number(volumeSlider.value);


  console.log("volume:", volume);
});
