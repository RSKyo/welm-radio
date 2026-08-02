import http from "/assets/js/http.js";
import { safeRun, safeHandler, toast } from "/assets/js/global.js";
import { ChipGroup } from "/assets/component/chip-group.js";
import { ItemList } from "/assets/component/item-list.js";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/* elements */
const selectAudioDirBtn = document.querySelector("#select-audio-dir");

const audioTypeFilterEl = document.querySelector("#audio-type-filter");
const audioLanguageFilterEl = document.querySelector("#audio-language-filter");
const audioPositionFilterEl = document.querySelector("#audio-position-filter");
const audioCategoryFilterEl = document.querySelector("#audio-category-filter");

const selectAllChk = document.querySelector("#select-all");
const removeAudioBtn = document.querySelector("#remove-audio");
const addAudioBtn = document.querySelector("#add-audio");
const audioCountEl = document.querySelector("#audio-count");
const audioListEl = document.querySelector("#audio-list");

const resetMetaBtn = document.querySelector("#reset-meta");
const saveMetaBtn = document.querySelector("#save-meta");
const renameAudioBtn = document.querySelector("#rename-audio");
const audioFormFrm = document.querySelector("#audio-form");
const audioFields = audioFormFrm.elements;
const metaFormFrm = document.querySelector("#meta-form");
const metaFields = metaFormFrm.elements;
const metaTypeEl = document.querySelector("#meta-type");
const metaLanguageEl = document.querySelector("#meta-language");
const metaPositionEl = document.querySelector("#meta-position");

/* components */
const audioTypeFilterCmp = new ChipGroup(audioTypeFilterEl);
const audioLanguageFilterCmp = new ChipGroup(audioLanguageFilterEl);
const audioPositionFilterCmp = new ChipGroup(audioPositionFilterEl);
const audioCategoryFilterCmp = new ChipGroup(audioCategoryFilterEl);
const audioListCmp = new ItemList(audioListEl, {
  textField: "base",
  valueField: "filePath",
});
const metaTypeCmp = new ChipGroup(metaTypeEl, { mode: "single" });
const metaLanguageCmp = new ChipGroup(metaLanguageEl, { mode: "single" });
const metaPositionCmp = new ChipGroup(metaPositionEl, { mode: "single" });

/* state */
const state = {};
state.filters = {
  types: [],
  languages: [],
  positions: [],
  categories: [],
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
  listAudioCategory: async () => {
    return await http.get("/audio/api/list-audio-category");
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
  saveMeta: async (metaPath, meta) => {
    return await http.post("/audio/api/save-meta", {
      metaPath,
      meta,
    });
  },
  renameAudio: async (audioPath, name) => {
    return await http.post("/audio/api/rename-audio", { audioPath, name });
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
  audioCategoryFilterCmp.onChange = safeHandler(
    audioCategoryFilterCmp_changeHandler,
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

  audioListCmp.onChange = safeHandler(audioListCmp_changeHandler);
  audioListCmp.onCheckedChange = safeHandler(audioListCmp_checkedChangeHandler);

  resetMetaBtn.addEventListener(
    "click",
    safeHandler(resetMetaBtn_clickHandler),
  );
  saveMetaBtn.addEventListener("click", safeHandler(saveMetaBtn_clickHandler));
  renameAudioBtn.addEventListener(
    "click",
    safeHandler(renameAudioBtn_clickHandler),
  );
}

async function initData() {
  const [types, languages, positions, categories] = await Promise.all([
    apiCalls.listAudioType(),
    apiCalls.listAudioLanguage(),
    apiCalls.listAudioPosition(),
    apiCalls.listAudioCategory(),
  ]);

  await audioTypeFilterCmp.setItems(types);
  await audioLanguageFilterCmp.setItems(languages);
  await audioPositionFilterCmp.setItems(positions);
  await audioCategoryFilterCmp.setItems(categories);

  await metaTypeCmp.setItems(types);
  await metaLanguageCmp.setItems(languages);
  await metaPositionCmp.setItems(positions);

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

async function audioCategoryFilterCmp_changeHandler(items) {
  state.filters.categories = items.map((item) => item.value);
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

async function audioListCmp_changeHandler(item, oldItem) {
  await setFormAudio(item);
  await setFormMeta(item.meta);
}

async function audioListCmp_checkedChangeHandler(items) {
  selectAllChk.checked = items.length === audioListCmp.getItems().length;
}

async function resetMetaBtn_clickHandler() {
  const selectedItem = audioListCmp.getSelectedItem();

  if (!selectedItem) {
    toast.show("请先选择一个音频文件");
    return;
  }

  await setFormAudio(selectedItem);
  await setFormMeta(selectedItem.meta);
}

async function saveMetaBtn_clickHandler() {
  const selectedItem = audioListCmp.getSelectedItem();

  if (!selectedItem) {
    toast.show("请先选择一个音频文件");
    return;
  }

  const metaPath = selectedItem.metaPath;
  const meta = getFormMeta();

  const savedMeta = await apiCalls.saveMeta(metaPath, meta);

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

  // update the file name in the form if it has changed
  audioFields.fileName.value = selectedItem.name;

  toast.show("已保存音频元数据");
}

async function renameAudioBtn_clickHandler() {
  const selectedItem = audioListCmp.getSelectedItem();

  if (!selectedItem) {
    toast.show("请先选择一个音频文件");
    return;
  }

  const name = audioFields.fileName.value.trim();
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

  toast.show("音频文件重命名成功");
}

// -----------------------------------------------------------------------------
// helper functions
// -----------------------------------------------------------------------------

async function refreshAudioList() {
  const audios = await apiCalls.listAudio();
  await audioListCmp.setItems(audios);

  audioCountEl.textContent = audios.length == 0 ? "0" : audios.length;

  const item = audioListCmp.getSelectedItem();
  if (item) {
    await setFormAudio(item);
    await setFormMeta(item.meta);
  } else {
    await setFormAudio({});
    await setFormMeta({});
  }
}

async function setFormMeta(meta = {}) {
  metaFields.description.value = meta.description ?? "";
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
}

function getFormMeta() {
  return {
    description: metaFields.description.value.trim(),

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

    cutPoints: metaFields.cutPoints.value
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),

    createdAt: metaFields.createdAt.value.trim() || null,
    updatedAt: metaFields.updatedAt.value.trim() || null,
  };
}
async function setFormAudio(audio = {}) {
  // base is filename with extension, name is filename without extension
  audioFields.fileName.value = audio.name ?? "";
  audioFields.filePath.value = audio.filePath ?? "";
}
