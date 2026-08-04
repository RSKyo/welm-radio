import http from "/assets/js/http.js";
import { safeRun, safeHandler, toast } from "/assets/js/global.js";
import { ChipGroup } from "/assets/component/chip-group.js";
import { ItemList } from "/assets/component/item-list.js";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/* elements */

const audioTypeFilterEl = document.querySelector("#audio-type-filter");
const audioLanguageFilterEl = document.querySelector("#audio-language-filter");
const audioPositionFilterEl = document.querySelector("#audio-position-filter");
const audioDayPartFilterEl = document.querySelector("#audio-day-part-filter");
const audioCategoryFilterEl = document.querySelector("#audio-category-filter");
const audioAlternateGroupFilterEl = document.querySelector(
  "#audio-alternate-group-filter",
);

const selectAllChk = document.querySelector("#select-all");
const removeAudioBtn = document.querySelector("#remove-audio");
const addAudioBtn = document.querySelector("#add-audio");
const selectAudioDirBtn = document.querySelector("#select-audio-dir");
const selectOrderSel = document.querySelector("#select-order");
const audioCountEl = document.querySelector("#audio-count");
const audioListEl = document.querySelector("#audio-list");

const saveMetaBtn = document.querySelector("#save-meta");
const renameAudioBtn = document.querySelector("#rename-audio");
const metaFormFrm = document.querySelector("#meta-form");
const metaFields = metaFormFrm.elements;
const metaTypeEl = document.querySelector("#meta-type");
const metaLanguageEl = document.querySelector("#meta-language");
const metaPositionEl = document.querySelector("#meta-position");
const metaDayPartEl = document.querySelector("#meta-day-part");
const transcribeContentBtn = document.querySelector("#transcribe-content");
const selectWhisperModelBtn = document.querySelector("#select-whisper-model");
const whisperModelEl = document.querySelector("#whisper-model");
const detectDurationBtn = document.querySelector("#detect-duration");

const audioPlayerEl = document.querySelector("#audio-player");

/* components */
const audioTypeFilterCmp = new ChipGroup(audioTypeFilterEl, {
  titleField: "description",
});
const audioLanguageFilterCmp = new ChipGroup(audioLanguageFilterEl, {
  titleField: "description",
});
const audioPositionFilterCmp = new ChipGroup(audioPositionFilterEl, {
  titleField: "description",
});
const audioDayPartFilterCmp = new ChipGroup(audioDayPartFilterEl, {
  titleField: "description",
});
const audioCategoryFilterCmp = new ChipGroup(audioCategoryFilterEl, {
  titleField: "description",
});
const audioAlternateGroupFilterCmp = new ChipGroup(
  audioAlternateGroupFilterEl,
  { titleField: "description" },
);

const audioListCmp = new ItemList(audioListEl, {
  textField: "base",
  valueField: "filePath",
});

const metaTypeCmp = new ChipGroup(metaTypeEl, {
  mode: "single",
  titleField: "description",
});
const metaLanguageCmp = new ChipGroup(metaLanguageEl, {
  mode: "single",
  titleField: "description",
});
const metaPositionCmp = new ChipGroup(metaPositionEl, {
  mode: "single",
  titleField: "description",
});
const metaDayPartCmp = new ChipGroup(metaDayPartEl, {
  mode: "multiple",
  titleField: "description",
  showSelectActions: true,
});

/* state */
const state = {};
state.filters = {
  types: [],
  languages: [],
  positions: [],
  categories: [],
  alternateGroups: [],
};

/* api calls */
const apiCalls = {
  selectAudioDir: async () => {
    return await http.get("/audio/api/select-audio-dir");
  },
  listAudioType: async () => {
    return await http.get("/audio/api/list-audio-type");
  },
  listAudioLanguage: async () => {
    return await http.get("/audio/api/list-audio-language");
  },
  listAudioPosition: async () => {
    return await http.get("/audio/api/list-audio-position");
  },
  listAudioDayPart: async () => {
    return await http.get("/audio/api/list-audio-day-part");
  },
  listAudioCategory: async () => {
    return await http.get("/audio/api/list-audio-category");
  },
  listAudioAlternateGroup: async () => {
    return await http.get("/audio/api/list-audio-alternate-group");
  },
  listAudio: async () => {
    return await http.post("/audio/api/list-audio", state.filters);
  },
  removeAudio: async (files) => {
    return await http.post("/audio/api/remove-audio", { files });
  },
  addAudio: async () => {
    return await http.get("/audio/api/add-audio");
  },
  renameAudio: async (audioPath, name) => {
    return await http.post("/audio/api/rename-audio", { audioPath, name });
  },
  saveMeta: async (audioPath, meta) => {
    return await http.post("/audio/api/save-meta", {
      audioPath,
      meta,
    });
  },
  selectWhisperModel: async () => {
    return await http.get("/audio/api/select-whisper-model");
  },
  getWhisperModel: async () => {
    return await http.get("/audio/api/get-whisper-model");
  },
  transcribeAudioAndSaveMeta: async (audioPath) => {
    return await http.post("/audio/api/transcribe-audio-and-save-meta", {
      audioPath,
    });
  },
};

// -----------------------------------------------------------------------------
// init
// -----------------------------------------------------------------------------

// Bootstrap
await safeRun(initializePage);

async function initializePage() {
  bindEvents();
  await initData();
}

function bindEvents() {
  selectAudioDirBtn.addEventListener(
    "click",
    safeHandler(selectAudioDirBtn_clickHandler),
  );

  audioTypeFilterCmp.onChange = safeHandler(audioTypeFilterCmp_changeHandler);
  audioLanguageFilterCmp.onChange = safeHandler(
    audioLanguageFilterCmp_changeHandler,
  );
  audioPositionFilterCmp.onChange = safeHandler(
    audioPositionFilterCmp_changeHandler,
  );
  audioDayPartFilterCmp.onChange = safeHandler(
    audioDayPartFilterCmp_changeHandler,
  );
  audioCategoryFilterCmp.onChange = safeHandler(
    audioCategoryFilterCmp_changeHandler,
  );
  audioAlternateGroupFilterCmp.onChange = safeHandler(
    audioAlternateGroupFilterCmp_changeHandler,
  );

  selectAllChk.addEventListener(
    "change",
    safeHandler(selectAllChk_changeHandler),
  );
  removeAudioBtn.addEventListener(
    "click",
    safeHandler(removeAudioBtn_clickHandler),
  );
  addAudioBtn.addEventListener("click", safeHandler(addAudioBtn_clickHandler));
  selectOrderSel.addEventListener(
    "change",
    safeHandler(selectOrderSel_changeHandler),
  );
  renameAudioBtn.addEventListener(
    "click",
    safeHandler(renameAudioBtn_clickHandler),
  );

  audioListCmp.onChange = safeHandler(audioListCmp_changeHandler);
  audioListCmp.onDoubleClick = safeHandler(audioListCmp_doubleClickHandler);
  audioListCmp.onCheckedChange = safeHandler(audioListCmp_checkedChangeHandler);

  saveMetaBtn.addEventListener("click", safeHandler(saveMetaBtn_clickHandler));

  transcribeContentBtn.addEventListener(
    "click",
    safeHandler(transcribeContentBtn_clickHandler),
  );
  selectWhisperModelBtn.addEventListener(
    "click",
    safeHandler(selectWhisperModelBtn_clickHandler),
  );
  detectDurationBtn.addEventListener(
    "click",
    safeHandler(detectDurationBtn_clickHandler),
  );
}

async function initData() {
  const [types, languages, positions, dayParts, categories, alternateGroups] =
    await Promise.all([
      apiCalls.listAudioType(),
      apiCalls.listAudioLanguage(),
      apiCalls.listAudioPosition(),
      apiCalls.listAudioDayPart(),
      apiCalls.listAudioCategory(),
      apiCalls.listAudioAlternateGroup(),
    ]);

  await audioTypeFilterCmp.setItems(types);
  await audioLanguageFilterCmp.setItems(languages);
  await audioPositionFilterCmp.setItems(positions);
  await audioDayPartFilterCmp.setItems(dayParts);
  await audioCategoryFilterCmp.setItems(categories);
  await audioAlternateGroupFilterCmp.setItems(alternateGroups);

  await metaTypeCmp.setItems(types);
  await metaLanguageCmp.setItems(languages);
  await metaPositionCmp.setItems(positions);
  await metaDayPartCmp.setItems(dayParts);

  await refreshWhisperModel();

  refreshAudioList();
}

// -----------------------------------------------------------------------------
// event handlers
// -----------------------------------------------------------------------------

async function selectAudioDirBtn_clickHandler() {
  const { canceled } = await apiCalls.selectAudioDir();

  if (canceled) {
    return;
  }

  await refreshAudioList();
}

async function audioTypeFilterCmp_changeHandler(items) {
  state.filters.types = items.map((item) => item.value);
  await refreshAudioList();
}

async function audioLanguageFilterCmp_changeHandler(items) {
  state.filters.languages = items.map((item) => item.value);
  await refreshAudioList();
}

async function audioPositionFilterCmp_changeHandler(items) {
  state.filters.positions = items.map((item) => item.value);
  await refreshAudioList();
}

async function audioDayPartFilterCmp_changeHandler(items) {
  state.filters.dayParts = items.map((item) => item.value);
  await refreshAudioList();
}

async function audioCategoryFilterCmp_changeHandler(items) {
  state.filters.categories = items.map((item) => item.value);
  await refreshAudioList();
}

async function audioAlternateGroupFilterCmp_changeHandler(items) {
  state.filters.alternateGroups = items.map((item) => item.value);
  await refreshAudioList();
}

async function selectAllChk_changeHandler(event) {
  const isChecked = event.target.checked;

  if (isChecked) {
    await audioListCmp.checkAll();
  } else {
    await audioListCmp.uncheckAll();
  }
}

async function removeAudioBtn_clickHandler() {
  const checkedItems = audioListCmp.getCheckedItems();

  if (checkedItems.length === 0) {
    toast.show("请先选择要删除的音频文件");
    return;
  }

  const confirmDelete = confirm(
    `确定要删除选中的 ${checkedItems.length} 个音频文件吗？`,
  );

  if (!confirmDelete) {
    return;
  }

  const files = checkedItems.map((item) => item.filePath);

  const result = await apiCalls.removeAudio(files);

  if (result.success) {
    toast.show("已删除选中的音频文件");
    await refreshAudioList();
  } else {
    toast.show(`删除音频文件失败: ${result.error}`);
  }
}

async function addAudioBtn_clickHandler() {
  const { canceled, files } = await apiCalls.addAudio();

  if (canceled) {
    return;
  }

  await refreshAudioList();

  toast.show(`添加了 ${files.length} 个音频文件`);
}

async function renameAudioBtn_clickHandler() {
  const selectedItem = audioListCmp.getSelectedItem();

  if (!selectedItem) {
    toast.show("请先选择一个音频文件");
    return;
  }

  const name = window.prompt(
    "请输入新的文件名：",
    selectedItem.name, // 不带扩展名的旧名字
  );

  if (name === null) {
    return;
  }

  const audioPath = selectedItem.filePath;

  if (!name || name.trim() === "") {
    toast.show("音频文件名不能为空");
    return;
  }

  if (name === selectedItem.name) {
    toast.show("音频文件名未修改");
    return;
  }

  const confirmRename = confirm(
    `确定要将音频文件 "${selectedItem.name}" 重命名为 "${name}" 吗？`,
  );

  if (!confirmRename) {
    return;
  }

  const audioInfo = await apiCalls.renameAudio(audioPath, name);

  // update the item in the list
  const value = selectedItem.filePath;
  const updatedItem = {
    ...selectedItem,
    ...audioInfo,
  };

  await audioListCmp.updateItem(value, updatedItem);

  // set the meta form to the new meta
  await setFormMeta(audioInfo.meta);

  toast.show("音频文件重命名成功");
}

async function selectOrderSel_changeHandler() {
  const audios = audioListCmp.getItems();
  orderAudios(audios);
  await audioListCmp.setItems(audios);
}

async function audioListCmp_changeHandler(item, oldItem) {
  await setFormMeta(item.meta);
  setAudioPlayer(item);
}

async function audioListCmp_doubleClickHandler(item) {
  await setFormMeta(item.meta);
  setAudioPlayer(item);

  // play the audio
  audioPlayerEl.play();
}

async function audioListCmp_checkedChangeHandler(items) {
  selectAllChk.checked = items.length === audioListCmp.getItems().length;
}

async function saveMetaBtn_clickHandler() {
  const selectedItem = audioListCmp.getSelectedItem();

  if (!selectedItem) {
    toast.show("请先选择一个音频文件");
    return;
  }

  const audioPath = selectedItem.filePath;
  const meta = getFormMeta();

  const savedMeta = await apiCalls.saveMeta(audioPath, meta);

  await setFormMeta(savedMeta);

  // update the item in the list
  const value = selectedItem.filePath;
  const updatedItem = {
    ...selectedItem,
    meta: savedMeta,
  };

  await audioListCmp.updateItem(value, updatedItem);

  // if the category has changed, refresh the category filter
  if (selectedItem.meta.category !== savedMeta.category) {
    const categories = await apiCalls.listAudioCategory();
    await audioCategoryFilterCmp.setItems(categories);
  }

  // if the alternateGroup has changed, refresh the alternateGroup filter
  if (selectedItem.meta.alternateGroup !== savedMeta.alternateGroup) {
    const alternateGroups = await apiCalls.listAudioAlternateGroup();
    await audioAlternateGroupFilterCmp.setItems(alternateGroups);
  }

  toast.show("已保存音频元数据");
}

async function transcribeContentBtn_clickHandler() {
  const selectedItem = audioListCmp.getSelectedItem();

  if (!selectedItem) {
    toast.show("请先选择一个音频文件");
    return;
  }

  const audioPath = selectedItem.filePath;

  const confirmTranscribe = confirm(
    `确定要对音频文件 "${selectedItem.name}" 进行转录吗？`,
  );

  if (!confirmTranscribe) {
    return;
  }

  const oldButtonValue = transcribeContentBtn.value;
  transcribeContentBtn.value = "转录中...";
  transcribeContentBtn.disabled = true;
  toast.show("音频转录任务即将开始，完成后会自动更新内容字段，无需等待...");

  try {
    const savedMeta = await apiCalls.transcribeAudioAndSaveMeta(audioPath);
  } catch (error) {
    toast.show(`音频转录失败: ${error.message}`);
    transcribeContentBtn.value = oldButtonValue;
    transcribeContentBtn.disabled = false;
    return;
  }

  // update the item in the list
  const value = selectedItem.filePath;
  const updatedItem = {
    ...selectedItem,
    meta: savedMeta,
  };

  await audioListCmp.updateItem(value, updatedItem);

  const currentSelectedItem = audioListCmp.getSelectedItem();
  if (currentSelectedItem && currentSelectedItem.filePath === value) {
    await setFormMeta(savedMeta);
  }

  transcribeContentBtn.value = oldButtonValue;
  transcribeContentBtn.disabled = false;
}

async function selectWhisperModelBtn_clickHandler() {
  const { canceled, path } = await apiCalls.selectWhisperModel();

  if (canceled) {
    return;
  }

  await refreshWhisperModel();

  toast.show(`已选择 Whisper 模型: ${path}`);
}

async function detectDurationBtn_clickHandler() {
  const selectedItem = audioListCmp.getSelectedItem();

  if (!selectedItem) {
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
// helper functions
// -----------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshAudioList() {
  const audios = await apiCalls.listAudio();
  orderAudios(audios);
  await audioListCmp.setItems(audios);

  audioCountEl.textContent = audios.length == 0 ? "0" : audios.length;

  const item = audioListCmp.getSelectedItem();
  if (item) {
    await setFormMeta(item.meta);
    setAudioPlayer(item);
  } else {
    await setFormMeta({});
    setAudioPlayer({});
  }
}

function setAudioPlayer(audio) {
  const url = `/audio/api/load-audio?filePath=${encodeURIComponent(audio.filePath)}`;
  const src = audio.filePath ? url : "";

  audioPlayerEl.src = src;
  audioPlayerEl.load();
}

function orderAudios(audios) {
  const order = selectOrderSel.value;

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

async function setFormMeta(meta = {}) {
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

  await metaTypeCmp.setValue(meta.type ?? "");
  await metaLanguageCmp.setValue(meta.language ?? "");
  await metaPositionCmp.setValue(meta.position ?? "");
  await metaDayPartCmp.setValues(meta.dayPart ?? []);
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

    type: metaTypeCmp.getValue(),
    language: metaLanguageCmp.getValue(),
    position: metaPositionCmp.getValue(),
    dayPart: metaDayPartCmp.getValues(),

    cutPoints: metaFields.cutPoints.value
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),

    createdAt: metaFields.createdAt.value.trim() || null,
    updatedAt: metaFields.updatedAt.value.trim() || null,
  };
}

async function refreshWhisperModel() {
  const { whisperModel } = await apiCalls.getWhisperModel();
  whisperModelEl.textContent = whisperModel
    ? `(当前模型: ${whisperModel})`
    : "未选择";
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
