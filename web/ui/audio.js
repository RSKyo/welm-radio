import { safeRun, api, toast } from "/assets/js/global.js";
import { ChipGroup } from "/assets/component/chip-group.js";
import { ItemList } from "/assets/component/item-list.js";

const chkSelectAll = document.querySelector("#chkSelectAll");
const btnDeleteAudio = document.querySelector("#btnDeleteAudio");
const btnSelectAudioDir = document.querySelector("#btnSelectAudioDir");
const spnAudioCount = document.querySelector("#spnAudioCount");

const btnResetMeta = document.querySelector("#btnResetMeta");
const btnSaveMeta = document.querySelector("#btnSaveMeta");

const frmMeta = document.querySelector("#frmMeta");
const metaFields = frmMeta.elements;

let chipGrpAudioType,
  chipGrpAudioLanguage,
  chipGrpAudioPosition,
  chipGrpAudioCategories;
let itemLstAudio;
let chipGrpMetaType, chipGrpMetaLanguage, chipGrpMetaPosition;

const filters = {
  types: [],
  languages: [],
  positions: [],
  categories: [],
};

// -----------------------------------------------------------------------------
// API Calls
// -----------------------------------------------------------------------------

async function getAudioTypes() {
  return await api.get("/audio/api/list-audio-type");
}

async function getAudioLanguages() {
  return await api.get("/audio/api/list-audio-language");
}

async function getAudioPositions() {
  return await api.get("/audio/api/list-audio-position");
}

async function getAudioCategories() {
  return await api.get("/audio/api/list-audio-category");
}

async function getAudioList() {
  return await api.post("/audio/api/list-audio", filters);
}

// -----------------------------------------------------------------------------
// event listeners
// -----------------------------------------------------------------------------

btnSelectAudioDir.addEventListener("click", async () => {
  await safeRun(async () => {
    const { dir, canceled } = await api.get("/audio/api/select-audio-dir");

    if (canceled) {
      return null;
    }

    await renderAudioList();
  });
});

chkSelectAll.addEventListener("change", async (event) => {
  await safeRun(async () => {
    const isChecked = event.target.checked;

    if (isChecked) {
      itemLstAudio.checkAll();
    } else {
      itemLstAudio.uncheckAll();
    }
  });
});

btnSaveMeta.addEventListener("click", async () => {
  await safeRun(async () => {
    const metaPath = metaFields.metaPath.value.trim();
    if (!metaPath) {
      return;
    }

    const meta = getFormMeta();
    const savedMeta = await api.post("/audio/api/save-meta", {
      metaPath,
      meta,
    });

    await setFormMeta(metaPath, savedMeta);

    const selectedItem = itemLstAudio.getSelectedItem();
    if (selectedItem) {
      const updatedItem = {
        ...selectedItem,
        meta: savedMeta,
      };

      await itemLstAudio.updateItem(updatedItem);

      const oldMeta = selectedItem.meta;
      if (oldMeta.category !== savedMeta.category) {
        await initAudioCategory();
      }
    }

    toast.show("保存成功");
  });
});

btnResetMeta.addEventListener("click", async () => {
  await safeRun(async () => {
    const metaPath = metaFields.metaPath.value.trim();
    if (!metaPath) {
      return;
    }

    const meta = itemLstAudio.getSelectedItem()?.meta ?? {};

    await setFormMeta(metaPath, meta);
  });
});

// -----------------------------------------------------------------------------
// init
// -----------------------------------------------------------------------------

await safeRun(init);

async function init() {
  chipGrpAudioType = new ChipGroup("#chipGrpAudioType", {
    textField: "label",
    valueField: "value",
    onChange: async (items) => {
      filters.types = items.map((item) => item.value);
      await renderAudioList();
    },
  });

  chipGrpAudioLanguage = new ChipGroup("#chipGrpAudioLanguage", {
    textField: "label",
    valueField: "value",
    onChange: async (items) => {
      filters.languages = items.map((item) => item.value);
      await renderAudioList();
    },
  });

  chipGrpAudioPosition = new ChipGroup("#chipGrpAudioPosition", {
    textField: "label",
    valueField: "value",
    onChange: async (items) => {
      filters.positions = items.map((item) => item.value);
      await renderAudioList();
    },
  });

  chipGrpAudioCategories = new ChipGroup("#chipGrpAudioCategories", {
    textField: "label",
    valueField: "value",
    onChange: async (items) => {
      filters.categories = items.map((item) => item.value);
      await renderAudioList();
    },
  });

  // new list-group for audio files
  itemLstAudio = new ItemList("#audioListEl", {
    textField: "base",
    valueField: "filePath",
    onChange: async (item, oldItem) => {
      await setFormMeta(item.metaPath, item.meta);
    },
    onCheckedChange: async (items) => {
      chkSelectAll.checked = items.length === itemLstAudio.getItems().length;
    },
  });

  chipGrpMetaType = new ChipGroup("#chipGrpMetaType", {
    textField: "label",
    valueField: "value",
    mode: "single",
  });

  chipGrpMetaLanguage = new ChipGroup("#chipGrpMetaLanguage", {
    textField: "label",
    valueField: "value",
    mode: "single",
  });

  chipGrpMetaPosition = new ChipGroup("#chipGrpMetaPosition", {
    textField: "label",
    valueField: "value",
    mode: "single",
  });

  await initAudioType();
  await initAudioLanguage();
  await initAudioPosition();
  await initAudioCategory();
  await renderAudioList();
  await initMetaType();
  await initMetaLanguage();
  await initMetaPosition();
}

// -----------------------------------------------------------------------------
// Select Audio Directory
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Init Audio Types, Languages, Positions
// -----------------------------------------------------------------------------

async function initAudioType() {
  const types = await getAudioTypes();
  await chipGrpAudioType.setItems(types);
}

async function initAudioLanguage() {
  const languages = await getAudioLanguages();
  await chipGrpAudioLanguage.setItems(languages);
}

async function initAudioPosition() {
  const positions = await getAudioPositions();
  await chipGrpAudioPosition.setItems(positions);
}

async function initAudioCategory() {
  const categories = await getAudioCategories();
  await chipGrpAudioCategories.setItems(categories);
}

// -----------------------------------------------------------------------------
// Render Audio List
// -----------------------------------------------------------------------------

async function renderAudioList() {
  const audios = await getAudioList();
  await itemLstAudio.setItems(audios);

  spnAudioCount.textContent = audios.length == 0 ? "" : audios.length;

  const item = itemLstAudio.getSelectedItem();
  if (item) {
    await setFormMeta(item.metaPath, item.meta);
  } else {
    await setFormMeta(null, {});
  }
}

// -----------------------------------------------------------------------------
// Init Meta Types, Languages, Positions
// -----------------------------------------------------------------------------

async function initMetaType() {
  const types = await getAudioTypes();
  await chipGrpMetaType.setItems(types);
}

async function initMetaLanguage() {
  const languages = await getAudioLanguages();
  await chipGrpMetaLanguage.setItems(languages);
}

async function initMetaPosition() {
  const positions = await getAudioPositions();
  await chipGrpMetaPosition.setItems(positions);
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

  await chipGrpMetaType.setValue(meta.type ?? "");
  await chipGrpMetaLanguage.setValue(meta.language ?? "");
  await chipGrpMetaPosition.setValue(meta.position ?? "");
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

    type: chipGrpMetaType.getValue(),
    language: chipGrpMetaLanguage.getValue(),
    position: chipGrpMetaPosition.getValue(),

    cutPoints: metaFields.cutPoints.value
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),

    createdAt: metaFields.createdAt.value.trim() || null,
    updatedAt: metaFields.updatedAt.value.trim() || null,
  };
}
