import { safeRun, api, toast } from "/assets/js/global.js";
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
const audioCountEl = document.querySelector("#audio-count");
const audioListEl = document.querySelector("#audio-list");

const resetMetaBtn = document.querySelector("#reset-meta");
const saveMetaBtn = document.querySelector("#save-meta");
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
    return await api.get("/audio/api/select-audio-dir");
  },
  listAudioType: async () => {
    return await api.get("/audio/api/list-audio-type");
  },
  listAudioLanguage: async () => {
    return await api.get("/audio/api/list-audio-language");
  },
  listAudioPosition: async () => {
    return await api.get("/audio/api/list-audio-position");
  },
  listAudioCategory: async () => {
    return await api.get("/audio/api/list-audio-category");
  },
  listAudio: async () => {
    return await api.post("/audio/api/list-audio", state.filters);
  },
  removeAudio: async (files) => {
    return await api.post("/audio/api/remove-audio", { files });
  },
  saveMeta: async (metaPath, meta) => {
    return await api.post("/audio/api/save-meta", {
      metaPath,
      meta,
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
  selectAudioDirBtn.addEventListener("click", selectAudioDirBtn_clickHandler);

  audioTypeFilterCmp.onChange = audioTypeFilterCmp_changeHandler;
  audioLanguageFilterCmp.onChange = audioLanguageFilterCmp_changeHandler;
  audioPositionFilterCmp.onChange = audioPositionFilterCmp_changeHandler;
  audioCategoryFilterCmp.onChange = audioCategoryFilterCmp_changeHandler;

  selectAllChk.addEventListener("change", selectAllChk_changeHandler);
  removeAudioBtn.addEventListener("click", removeAudioBtn_clickHandler);

  audioListCmp.onChange = audioListCmp_changeHandler;
  audioListCmp.onCheckedChange = audioListCmp_checkedChangeHandler;

  resetMetaBtn.addEventListener("click", resetMetaBtn_clickHandler);
  saveMetaBtn.addEventListener("click", saveMetaBtn_clickHandler);
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

  await apiCalls.removeAudio(files).then((result) => {
    if (result.success) {
      toast.show("已删除选中的音频文件");
    } else {
      toast.show(`删除音频文件失败: ${result.error}`);
    }
  });

  await refreshAudioList();
}

async function audioListCmp_changeHandler(item, oldItem) {
  await setFormMeta(item.metaPath, item.meta);
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

  await setFormMeta(selectedItem.metaPath, selectedItem.meta);
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

  await setFormMeta(metaPath, savedMeta);

  // update the item in the list
  const updatedItem = {
    ...selectedItem,
    meta: savedMeta,
  };

  await audioListCmp.updateItem(updatedItem);

  // if the category has changed, refresh the category filter
  if (selectedItem.meta.category !== savedMeta.category) {
    const categories = await apiCalls.listAudioCategory();
    await audioCategoryFilterCmp.setItems(categories);
  }

  toast.show("已保存音频元数据");
}
// -----------------------------------------------------------------------------
// helper functions
// -----------------------------------------------------------------------------

async function refreshAudioList() {
  const audios = await apiCalls.listAudio();
  await audioListCmp.setItems(audios);

  audioCountEl.textContent = audios.length == 0 ? "" : audios.length;

  const item = audioListCmp.getSelectedItem();
  if (item) {
    await setFormMeta(item.metaPath, item.meta);
  } else {
    await setFormMeta(null, {});
  }
}

async function setFormMeta(metaPath, meta = {}) {
  metaFields.metaPath.value = metaPath ?? "";
  metaFields.title.value = meta.title ?? "";
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
    title: metaFields.title.value.trim(),

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
