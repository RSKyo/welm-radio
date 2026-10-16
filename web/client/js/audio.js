import { toast, safeRun, on, isEqualValue } from "./helper.js";

import { SoloChipGroup, MultiChipGroup } from "../component/chip-group.js";
import { ItemList } from "../component/item-list.js";
import { AudioPlayer } from "../component/audio-player.js";

import { audioApi } from "../api/audio.api.js";
import { metaApi } from "../api/meta.api.js";
import { whisperApi } from "../api/whisper.api.js";

const STUDIO_AUDIO_PATHS_KEY = "studioAudioPaths";

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const selectAllChk = document.querySelector("#select-all");
const audioCountEl = document.querySelector("#audio-count");
const metaFormFrm = document.querySelector("#meta-form");
const metaFields = metaFormFrm.elements;
const whisperModelEl = document.querySelector("#whisper-model");
const vadModelEl = document.querySelector("#vad-model");
const startTranscriptionBtn = document.querySelector("#start-transcription");

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

const audioTypeFilterElm = new MultiChipGroup("#audio-type-filter", {
  rootClassExtra: "sm",
});
const audioLanguageFilterElm = new MultiChipGroup("#audio-language-filter", {
  rootClassExtra: "sm",
});
const audioPositionFilterElm = new MultiChipGroup("#audio-position-filter", {
  rootClassExtra: "sm",
});
const audioDayPartFilterElm = new MultiChipGroup("#audio-day-part-filter", {
  rootClassExtra: "sm",
});
const audioCategoryFilterElm = new MultiChipGroup("#audio-category-filter", {
  rootClassExtra: "sm",
});
const audioAlternateGroupFilterElm = new MultiChipGroup(
  "#audio-alternate-group-filter",
  {
    rootClassExtra: "sm",
  },
);

const audioListElm = new ItemList("#audio-list");
const audioPlayerElm = new AudioPlayer("#audio-player", {
  rootClassExtra: "sm",
});

const audioTypeElm = new SoloChipGroup("#audio-type");
const audioLanguageElm = new SoloChipGroup("#audio-language");
const audioPositionElm = new SoloChipGroup("#audio-position");
const audioDayPartElm = new MultiChipGroup("#audio-day-part");

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
  order: "updatedAt-desc",
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
  on(audioTypeFilterElm, "selectedChange", filterChanged);
  on(audioPositionFilterElm, "selectedChange", filterChanged);
  on(audioDayPartFilterElm, "selectedChange", filterChanged);
  on(audioLanguageFilterElm, "selectedChange", filterChanged);
  on(audioCategoryFilterElm, "selectedChange", filterChanged);
  on(audioAlternateGroupFilterElm, "selectedChange", filterChanged);

  on("#set-audio-root", "click", setAudioRoot);

  on("#select-all", "change", setAudiosCheckedState);
  on("#import-audios", "click", importAudios);
  on("#remove-audios", "click", removeAudios);
  on("#order-audios", "click", orderAudiosDescClickHandler);
  on("#add-audios-to-studio", "click", addAudiosToStudio);

  on(audioListElm, "selectedChange", changeAudio);
  on(audioListElm, "checkedChange", updateCheckedStateForSelectAll);
  on(audioListElm, "doubleClick", doubleClickAudio);

  on("#save-meta", "click", saveMeta);

  on("#start-transcription", "click", startTranscription);
  on("#select-whisper-model", "click", selectWhisperModel);
  on("#select-vad-model", "click", selectVadModel);
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

  audioTypeElm.setItems(types);
  audioLanguageElm.setItems(languages);
  audioPositionElm.setItems(positions);
  audioDayPartElm.setItems(dayParts);

  initWhisperModel();
  initVadModel();
  initTranscriptionButtonState();

  listAudios();
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

async function filterChanged({ elm, value }) {
  const name = elm.dataset.name;

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

async function setAudioRoot() {
  const { canceled } = await audioApi.setAudioRoot();

  if (canceled) {
    return;
  }

  listAudios();
}

async function removeAudios() {
  const audioPaths = audioListElm.checkedValue;

  if (audioPaths.length === 0) {
    toast.show("请先选择要删除的音频文件");
    return;
  }

  const confirmDelete = confirm(
    `确定要删除选中的 ${audioPaths.length} 个音频文件吗？`,
  );

  if (!confirmDelete) {
    return;
  }

  await audioApi.removeAudios(audioPaths);
  for (const audioPath of audioPaths) {
    audioListElm.removeItem(audioPath);
  }

  toast.show("已删除选中的音频文件");

  listAudios();
}

async function importAudios() {
  const { canceled, audioPaths } = await audioApi.importAudios();

  if (canceled) {
    return;
  }

  toast.show(`添加了 ${audioPaths.length} 个音频文件`);

  listAudios();
}

async function orderAudiosDescClickHandler(event) {
  switch (state.order) {
    case "updatedAt-desc":
      state.order = "updatedAt-asc";
      break;
    case "updatedAt-asc":
      state.order = "updatedAt-desc";
      break;
    default:
      state.order = "updatedAt-desc";
      break;
  }

  const audios = audioListElm.getItems();
  orderAudios(audios);
  audioListElm.setItems(audios);
}

function addAudiosToStudio() {
  const audioPaths = audioListElm.checkedValue;

  if (audioPaths.length === 0) {
    toast.show("请先选择要加入Studio的音频文件");
    return;
  }

  localStorage.setItem(STUDIO_AUDIO_PATHS_KEY, JSON.stringify(audioPaths));
  toast.show("已将选中的音频文件加入Studio");
}

async function changeAudio({ item }) {
  setFormMeta(item?.meta);
  setAudioPlayer(item?.audioPath, item.meta.title);
}

async function doubleClickAudio({ item }) {
  changeAudio({ item });
  audioPlayerElm.play();
}

async function updateCheckedStateForSelectAll() {
  const checkedValues = audioListElm.checkedValue;
  const check =
    checkedValues == null
      ? false
      : checkedValues.length === audioListElm.getItems().length;
  selectAllChk.checked = check;
}

async function setAudiosCheckedState(event) {
  if (event.target.checked) {
    audioListElm.checkAll();
  } else {
    audioListElm.uncheckAll();
  }
}

async function saveMeta() {
  const item = audioListElm.getItemByValue(audioListElm.selectedValue);

  if (!item) {
    toast.show("请先选择一个音频文件");
    return;
  }

  const oldMeta = item.meta;
  const audioPath = item.audioPath;
  const newMeta = getFormMeta();

  const savedMeta = await metaApi.saveMeta(audioPath, newMeta);

  setFormMeta(savedMeta);

  // update the item in the list
  const updatedItem = {
    ...item,
    text: savedMeta.title + savedMeta.extension || item.text,
    meta: savedMeta,
  };

  audioListElm.updateItem(updatedItem);

  // if the category has changed, refresh the category filter
  if (!isEqualValue(item.meta.category, savedMeta.category)) {
    const categories = await audioApi.listAudioCategories();
    audioCategoryFilterElm.setItems(categories);
  }

  // if the alternateGroup has changed, refresh the alternateGroup filter
  if (item.meta.alternateGroup !== savedMeta.alternateGroup) {
    const alternateGroups = await audioApi.listAudioAlternateGroups();
    audioAlternateGroupFilterElm.setItems(alternateGroups);
  }

  toast.show("已保存音频元数据");
}

async function startTranscription() {
  const item = audioListElm.getItemByValue(audioListElm.selectedValue);

  if (!item) {
    toast.show("请先选择一个音频文件");
    return;
  }

  const confirmTranscribe = confirm(
    `确定要对音频文件 "${item.base}" 进行转录吗？`,
  );

  if (!confirmTranscribe) {
    return;
  }

  setStartTranscriptionButtonState(true);
  toast.show("音频转录中...");

  let savedMeta = null;
  try {
    const audioPath = item.audioPath;
    const language = audioLanguageElm.selectedValue || "zh";

    savedMeta = await whisperApi.startTranscription(audioPath, language);
  } catch (error) {
    toast.show(`音频转录失败: ${error.message}`);
    setStartTranscriptionButtonState(false);
    return;
  }

  toast.show(`音频转录完成: ${item.base}`);

  setStartTranscriptionButtonState(false);

  // update the item in the list
  const updatedItem = {
    ...item,
    meta: savedMeta,
  };

  audioListElm.updateItem(updatedItem);

  // if current selected item is the same as the one we just transcribed, update the form meta
  const currentItem = audioListElm.getItemByValue(audioListElm.selectedValue);
  if (currentItem && currentItem.audioPath === item.audioPath) {
    setFormMeta(savedMeta);
  }
}

async function selectWhisperModel() {
  const { canceled, modelName } = await whisperApi.selectWhisperModel();

  if (canceled) {
    return;
  }

  setWhisperModel(modelName);

  toast.show(`已选择 Whisper 模型: ${modelName}`);
}

async function selectVadModel() {
  const { canceled, modelName } = await whisperApi.selectVadModel();

  if (canceled) {
    return;
  }

  setVadModel(modelName);

  toast.show(`已选择 VAD 模型: ${modelName}`);
}

// -----------------------------------------------------------------------------
// Page Logic
// -----------------------------------------------------------------------------

/** audio list */

async function listAudios() {
  const audios = await audioApi.listAudios(state.filters);
  orderAudios(audios);
  audioListElm.setItems(audios);

  audioCountEl.textContent = audios.length == 0 ? "0" : audios.length;

  const item = audioListElm.getItemByValue(audioListElm.selectedValue);
  if (item) {
    setFormMeta(item.meta);
    setAudioPlayer(item.audioPath, item.meta.title);
  } else {
    setFormMeta({});
    setAudioPlayer("", "");
  }
}

function orderAudios(audios) {
  const order = state.order;
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

function setAudioPlayer(audioPath, title) {
  audioPlayerElm.src = audioApi.loadAudioStream(audioPath);
  audioPlayerElm.title = title;
}

/** meta form */

function setFormMeta(meta = {}) {
  metaFields.audioPath.value = meta.audioPath ?? "";
  metaFields.metaPath.value = meta.metaPath ?? "";
  metaFields.title.value = meta.title ?? "";
  metaFields.extension.value = meta.extension ?? "";

  metaFields.alternateGroup.value = meta.alternateGroup ?? "";

  metaFields.category.value = Array.isArray(meta.category)
    ? meta.category.join(", ")
    : (meta.category ?? "");
  metaFields.content.value = meta.content ?? "";

  metaFields.start.value = meta.start ?? 0;
  metaFields.start.min = 0;
  metaFields.start.max = meta.duration ?? 0;
  metaFields.end.value = meta.end ?? 0;
  metaFields.end.min = 0;
  metaFields.end.max = meta.duration ?? 0;

  metaFields.cutPoints.value = Array.isArray(meta.cutPoints)
    ? meta.cutPoints.join("\n")
    : "";

  audioTypeElm.selectedValue = meta.type ?? "";
  audioLanguageElm.selectedValue = meta.language ?? "";
  audioPositionElm.selectedValue = meta.position ?? "";
  audioDayPartElm.selectedValue = meta.dayPart ?? [];
}

function getFormMeta() {
  return {
    audioPath: metaFields.audioPath.value.trim(),
    metaPath: metaFields.metaPath.value.trim(),
    title: metaFields.title.value.trim(),
    extension: metaFields.extension.value.trim(),

    alternateGroup: metaFields.alternateGroup.value.trim(),

    category: metaFields.category.value
      .split(/[,，]/)
      .map((value) => value.trim())
      .filter(Boolean),

    content: metaFields.content.value.trim(),

    start: Number(metaFields.start.value.trim()) || 0,
    end: Number(metaFields.end.value.trim()) || 0,

    cutPoints: metaFields.cutPoints.value
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),

    type: audioTypeElm.selectedValue,
    language: audioLanguageElm.selectedValue,
    position: audioPositionElm.selectedValue,
    dayPart: audioDayPartElm.selectedValue,
  };
}

/** whisper */

async function initWhisperModel() {
  const { modelName } = await whisperApi.getWhisperModel();

  setWhisperModel(modelName);
}

function setWhisperModel(modelName) {
  whisperModelEl.textContent = "Whisper Model: " + modelName || "未选择";
}

async function initVadModel() {
  const { modelName } = await whisperApi.getVadModel();

  setVadModel(modelName);
}

function setVadModel(modelName) {
  vadModelEl.textContent = "VAD Model: " + modelName || "未选择";
}

async function initTranscriptionButtonState() {
  const { isTranscribing } = await whisperApi.getTranscriptionStatus();

  if (isTranscribing) {
    setStartTranscriptionButtonState(true);
  } else {
    setStartTranscriptionButtonState(false);
  }
}

function setStartTranscriptionButtonState(isTranscribing) {
  if (isTranscribing) {
    startTranscriptionBtn.textContent = "转录中...";
    startTranscriptionBtn.disabled = true;
  } else {
    startTranscriptionBtn.textContent = "识别音频内容";
    startTranscriptionBtn.disabled = false;
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
