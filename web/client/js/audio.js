import {
  safeRun,
  safeHandler,
  toast,
  domEvent,
  haveSameValues,
} from "./pub.js";
import { SoloChipGroup, MultiChipGroup } from "../component/chip-group.js";
import { ItemList } from "../component/item-list.js";

import { audioApi } from "../api/audio.api.js";
import { metaApi } from "../api/meta.api.js";
import { whisperApi } from "../api/whisper.api.js";

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

const selectAllChk = document.querySelector("#select-all");
const audioCountEl = document.querySelector("#audio-count");
const audioPlayerEl = document.querySelector("#audio-player");
const metaFormFrm = document.querySelector("#meta-form");
const metaFields = metaFormFrm.elements;
const whisperModelEl = document.querySelector("#whisper-model");
const startTranscriptionBtn = document.querySelector("#start-transcription");

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

const audioTypeFilterCmp = new MultiChipGroup("#audio-type-filter");
const audioLanguageFilterCmp = new MultiChipGroup("#audio-language-filter");
const audioPositionFilterCmp = new MultiChipGroup("#audio-position-filter");
const audioDayPartFilterCmp = new MultiChipGroup("#audio-day-part-filter");
const audioCategoryFilterCmp = new MultiChipGroup("#audio-category-filter");
const audioAlternateGroupFilterCmp = new MultiChipGroup(
  "#audio-alternate-group-filter",
);

const audiosCmp = new ItemList("#audios");

const audioTypeCmp = new SoloChipGroup("#audio-type");
const audioLanguageCmp = new SoloChipGroup("#audio-language");
const audioPositionCmp = new SoloChipGroup("#audio-position");
const audioDayPartCmp = new MultiChipGroup("#audio-day-part", {
  showSelectActions: true,
});

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

await safeRun(initializePage);

async function initializePage() {
  bindEvents();
  await initData();
}

function bindEvents() {
  audioTypeFilterCmp.onSelect = safeHandler(filterChanged);
  audioPositionFilterCmp.onSelect = safeHandler(filterChanged);
  audioDayPartFilterCmp.onSelect = safeHandler(filterChanged);
  audioLanguageFilterCmp.onSelect = safeHandler(filterChanged);
  audioCategoryFilterCmp.onSelect = safeHandler(filterChanged);
  audioAlternateGroupFilterCmp.onSelect = safeHandler(filterChanged);

  domEvent.click("#set-audio-root", setAudioRoot);

  domEvent.change("#select-all", setAudiosCheckedState);
  domEvent.click("#remove-audios", removeAudios);
  domEvent.click("#import-audios", importAudios);
  domEvent.change("#order", orderChanged);

  audiosCmp.onClick = safeHandler(selectAudio);
  audiosCmp.onDoubleClick = safeHandler(doubleClickAudio);
  audiosCmp.onCheckedChange = safeHandler(setSelectAllCheckedState);

  domEvent.click("#save-meta", saveMeta);

  domEvent.click("#start-transcription", startTranscription);
  domEvent.click("#select-whisper-model", selectWhisperModel);

  domEvent.click("#detect-duration", detectDuration);
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

  audioTypeFilterCmp.setItems(types);
  audioLanguageFilterCmp.setItems(languages);
  audioPositionFilterCmp.setItems(positions);
  audioDayPartFilterCmp.setItems(dayParts);
  audioCategoryFilterCmp.setItems(categories);
  audioAlternateGroupFilterCmp.setItems(alternateGroups);

  audioTypeCmp.setItems(types);
  audioLanguageCmp.setItems(languages);
  audioPositionCmp.setItems(positions);
  audioDayPartCmp.setItems(dayParts);

  await initWhisperModel();
  await initTranscriptionButtonState();

  await listAudios();
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

async function filterChanged({ target, values }) {
  const name = target.dataset.name;

  switch (name) {
    case "audio-type-filter":
      state.filters.types = values;
      break;
    case "audio-language-filter":
      state.filters.languages = values;
      break;
    case "audio-position-filter":
      state.filters.positions = values;
      break;
    case "audio-day-part-filter":
      state.filters.dayParts = values;
      break;
    case "audio-category-filter":
      state.filters.categories = values;
      break;
    case "audio-alternate-group-filter":
      state.filters.alternateGroups = values;
      break;
  }

  await listAudios();
}

async function setAudioRoot() {
  const { canceled } = await audioApi.setAudioRoot();

  if (canceled) {
    return;
  }

  await listAudios();
}

async function removeAudios() {
  const audioPaths = audiosCmp.getCheckedValues();

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

  toast.show("已删除选中的音频文件");
  await listAudios();
}

async function importAudios() {
  const { canceled, audioPaths } = await audioApi.importAudios();

  if (canceled) {
    return;
  }

  await listAudios();

  toast.show(`添加了 ${audioPaths.length} 个音频文件`);
}

async function orderChanged(event) {
  state.order = event.target.value;

  const audios = audiosCmp.getItems();
  orderAudios(audios);
  await audiosCmp.setItems(audios);
}

async function selectAudio({ item }) {
  setFormMeta(item.meta);
  setAudioPlayer(item.audioPath);
}

async function doubleClickAudio({ item }) {
  selectAudio({ item });
  audioPlayerEl.play();
}

async function setSelectAllCheckedState({ values }) {
  selectAllChk.checked = values.length === audiosCmp.getItems().length;
}

async function setAudiosCheckedState(event) {
  const isChecked = event.target.checked;

  if (isChecked) {
    await audiosCmp.checkAll();
  } else {
    await audiosCmp.uncheckAll();
  }
}

async function saveMeta() {
  const item = audiosCmp.getItem();

  if (!item) {
    toast.show("请先选择一个音频文件");
    return;
  }

  const savedMeta = await metaApi.saveMeta(item.audioPath, getFormMeta());

  setFormMeta(savedMeta);

  // update the item in the list
  const updatedItem = {
    ...item,
    meta: savedMeta,
  };

  await audiosCmp.updateItem(item.audioPath, updatedItem);

  // if the category has changed, refresh the category filter
  if (!haveSameValues(item.meta.category, savedMeta.category)) {
    const categories = await audioApi.listAudioCategories();
    await audioCategoryFilterCmp.setItems(categories);
  }

  // if the alternateGroup has changed, refresh the alternateGroup filter
  if (item.meta.alternateGroup !== savedMeta.alternateGroup) {
    const alternateGroups = await audioApi.listAudioAlternateGroups();
    await audioAlternateGroupFilterCmp.setItems(alternateGroups);
  }

  toast.show("已保存音频元数据");
}

async function startTranscription() {
  const item = audiosCmp.getItem();

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
    const language = audioLanguageCmp.getValue() || "zh";

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

  await audiosCmp.updateItem(item.audioPath, updatedItem);

  // if current selected item is the same as the one we just transcribed, update the form meta
  const currentItem = audiosCmp.getItem();
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

async function detectDuration() {
  const item = audiosCmp.getItem();

  if (!item) {
    toast.show("请先选择一个音频文件");
    return;
  }

  let duration = null;
  const timeout = 3000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    duration = audioPlayerEl.duration;

    if (Number.isFinite(duration)) {
      break;
    }

    if (audioPlayerEl.error) {
      toast.show("音频加载失败，无法获取时长");
      return;
    }

    await sleep(100);
  }

  if (!Number.isFinite(duration)) {
    toast.show("音频信息尚未加载完成，请稍后再试");
    return;
  }

  const formattedDuration = formatTime(duration);

  metaFields.duration.value = formattedDuration;
  metaFields.end.value ||= formattedDuration;

  toast.show(`已检测音频时长: ${formattedDuration}`);
}

// -----------------------------------------------------------------------------
// Page Logic
// -----------------------------------------------------------------------------

/** audio list */

async function listAudios() {
  const audios = await audioApi.listAudios(state.filters);
  orderAudios(audios);
  audiosCmp.setItems(audios);

  audioCountEl.textContent = audios.length == 0 ? "0" : audios.length;

  const item = audiosCmp.getItem();
  if (item) {
    setFormMeta(item.meta);
    setAudioPlayer(item.audioPath);
  } else {
    setFormMeta({});
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

/** meta form */

function setFormMeta(meta = {}) {
  metaFields.id.value = meta.id ?? "";
  metaFields.audioPath.value = meta.audioPath ?? "";
  metaFields.metaPath.value = meta.metaPath ?? "";

  metaFields.description.value = meta.description ?? "";
  metaFields.alternateGroup.value = meta.alternateGroup ?? "";

  metaFields.category.value = Array.isArray(meta.category)
    ? meta.category.join(", ")
    : (meta.category ?? "");
  metaFields.content.value = meta.content ?? "";

  metaFields.duration.value = meta.duration ?? "";
  metaFields.start.value = meta.start ?? "00:00:00.000";
  metaFields.end.value = meta.end ?? "";

  metaFields.cutPoints.value = Array.isArray(meta.cutPoints)
    ? meta.cutPoints.join("\n")
    : "";

  metaFields.createdAt.value = meta.createdAt ?? "";
  metaFields.updatedAt.value = meta.updatedAt ?? "";

  audioTypeCmp.setValue(meta.type ?? "");
  audioLanguageCmp.setValue(meta.language ?? "");
  audioPositionCmp.setValue(meta.position ?? "");
  audioDayPartCmp.setValues(meta.dayPart ?? []);
}

function getFormMeta() {
  return {
    id: metaFields.id.value.trim(),
    audioPath: metaFields.audioPath.value.trim(),
    metaPath: metaFields.metaPath.value.trim(),

    description: metaFields.description.value.trim(),
    alternateGroup: metaFields.alternateGroup.value.trim(),

    category: metaFields.category.value
      .split(/[,，]/)
      .map((value) => value.trim())
      .filter(Boolean),

    content: metaFields.content.value.trim(),

    duration: metaFields.duration.value.trim() || null,
    start: metaFields.start.value.trim() || "00:00:00.000",
    end: metaFields.end.value.trim() || null,

    cutPoints: metaFields.cutPoints.value
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),

    createdAt: metaFields.createdAt.value.trim() || null,
    updatedAt: metaFields.updatedAt.value.trim() || null,

    type: audioTypeCmp.getValue(),
    language: audioLanguageCmp.getValue(),
    position: audioPositionCmp.getValue(),
    dayPart: audioDayPartCmp.getValues(),
  };
}

/** whisper */

async function initWhisperModel() {
  const { modelName } = await whisperApi.getWhisperModel();

  setWhisperModel(modelName);
}

function setWhisperModel(modelName) {
  whisperModelEl.textContent = modelName
    ? `(当前模型: ${modelName})`
    : "未选择";
}

async function initTranscriptionButtonState() {
  const { isTranscribing } = await whisperApi.isTranscribing();

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
    startTranscriptionBtn.textContent = "转录内容";
    startTranscriptionBtn.disabled = false;
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTime(seconds) {
  if (seconds == null) {
    return null;
  }

  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`invalid time value: ${seconds}`);
  }

  const totalMilliseconds = Math.round(seconds * 1000);

  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const second = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minute = totalMinutes % 60;
  const hour = Math.floor(totalMinutes / 60);

  const hourText = String(hour).padStart(2, "0");
  const minuteText = String(minute).padStart(2, "0");
  const secondText = String(second).padStart(2, "0");
  const millisecondText = String(milliseconds).padStart(3, "0");

  return `${hourText}:${minuteText}:${secondText}.${millisecondText}`;
}
