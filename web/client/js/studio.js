import { toast, safeRun, on } from "./helper.js";
import { sleep, isEqualValue, formatTime } from "./util.js";

import { SoloChipGroup, MultiChipGroup } from "../component/chip-group.js";
import { Timeline } from "../component/timeline.js";
import { ItemList } from "../component/item-list.js";

import { audioApi } from "../api/audio.api.js";

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const audioCountEl = document.querySelector("#audio-count");
const audioPlayerEl = document.querySelector("#audio-player");

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

const audioTypeFilterElm = new MultiChipGroup("#audio-type-filter");
const audioLanguageFilterElm = new MultiChipGroup("#audio-language-filter");
const audioPositionFilterElm = new MultiChipGroup("#audio-position-filter");
const audioDayPartFilterElm = new MultiChipGroup("#audio-day-part-filter");
const audioCategoryFilterElm = new MultiChipGroup("#audio-category-filter");
const audioAlternateGroupFilterElm = new MultiChipGroup(
  "#audio-alternate-group-filter",
);

const audiosElm = new ItemList("#audios",{showCheckboxes: false});

const timelineElm = new Timeline("#timeline");

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

const state = {
  filters: {
    types: [],
    languages: [],
    positions: [],
    categories: [],
    alternateGroups: [],
  },
  order: "default",
};

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

safeRun(initializePage);

function initializePage() {
  bindEvents();
  initData();
}

function bindEvents() {
  on.selectedChange(audioTypeFilterElm, filterChanged);
  on.selectedChange(audioPositionFilterElm, filterChanged);
  on.selectedChange(audioDayPartFilterElm, filterChanged);
  on.selectedChange(audioLanguageFilterElm, filterChanged);
  on.selectedChange(audioCategoryFilterElm, filterChanged);
  on.selectedChange(audioAlternateGroupFilterElm, filterChanged);

  on.change("#order", orderChanged);

  on.doubleClick(audiosElm, doubleClickAudio);
}

async function initData() {
  const [types, languages, positions, dayParts, categories, alternateGroups] =
    await Promise.all([
      audioApi.listAudioTypes(),
      audioApi.listAudioLanguages(),
      audioApi.listAudioPositions(),
      audioApi.listAudioDayParts(),
      audioApi.listAudioCategories(),
      audioApi.listAudioAlternateGroups(),
    ]);

  audioTypeFilterElm.setItems(types);
  audioLanguageFilterElm.setItems(languages);
  audioPositionFilterElm.setItems(positions);
  audioDayPartFilterElm.setItems(dayParts);
  audioCategoryFilterElm.setItems(categories);
  audioAlternateGroupFilterElm.setItems(alternateGroups);

  listAudios();
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

async function filterChanged({ target, value }) {
  const name = target.dataset.name;

  switch (name) {
    case "audio-type-filter":
      state.filters.types = value;
      break;
    case "audio-language-filter":
      state.filters.languages = value;
      break;
    case "audio-position-filter":
      state.filters.positions = value;
      break;
    case "audio-day-part-filter":
      state.filters.dayParts = value;
      break;
    case "audio-category-filter":
      state.filters.categories = value;
      break;
    case "audio-alternate-group-filter":
      state.filters.alternateGroups = value;
      break;
  }

  listAudios();
}

async function orderChanged(event) {
  state.order = event.target.value;

  const audios = audiosElm.getItems();
  orderAudios(audios);
  audiosElm.setItems(audios);
}

async function doubleClickAudio({ item }) {
  setAudioPlayer(item.audioPath);
  audioPlayerEl.play();
}


// -----------------------------------------------------------------------------
// Page Logic
// -----------------------------------------------------------------------------

/** audio list */

async function listAudios() {
  const audios = await audioApi.listAudios(state.filters);
  orderAudios(audios);
  audiosElm.setItems(audios);

  audioCountEl.textContent = audios.length == 0 ? "0" : audios.length;

  const item = audiosElm.getItem(audiosElm.getSelectedValue());
  if (item) {
    setAudioPlayer(item.audioPath);
  } else {
    setAudioPlayer("");
  }
}

function orderAudios(audios) {
  const order = state.order;

  if (order === "default") {
    audios.sort((a, b) => {
      const aTime = Date.parse(a.meta?.updatedAt ?? "");
      const bTime = Date.parse(b.meta?.updatedAt ?? "");

      const aHasTime = Number.isFinite(aTime);
      const bHasTime = Number.isFinite(bTime);

      // 没有更新时间的音频始终放前面
      if (!aHasTime && !bHasTime) {
        return a.name.localeCompare(b.name);
      }

      if (!aHasTime) return -1;
      if (!bHasTime) return 1;

      return (aTime - bTime) * -1 || a.name.localeCompare(b.name);
    });
    return;
  }

  const [field, direction] = order.split("-");
  const factor = direction === "asc" ? 1 : -1;

  audios.sort((a, b) => {
    const aTime = Date.parse(a.meta?.[field] ?? "");
    const bTime = Date.parse(b.meta?.[field] ?? "");

    const aHasTime = Number.isFinite(aTime);
    const bHasTime = Number.isFinite(bTime);

    // 没有创建/更新时间的音频始终放最后
    if (!aHasTime && !bHasTime) {
      return a.name.localeCompare(b.name);
    }

    if (!aHasTime) return 1;
    if (!bHasTime) return -1;

    return (aTime - bTime) * factor || a.name.localeCompare(b.name);
  });
}

function setAudioPlayer(audioPath) {
  audioPlayerEl.src = audioApi.getAudioPlayerSrc(audioPath);
  audioPlayerEl.load();
}
