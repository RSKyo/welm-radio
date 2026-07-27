import { safeRun, api } from "/assets/js/global.js";
import { ChipGroup } from "/assets/component/chip-group.js";
import { ItemList } from "/assets/component/item-list.js";

const chkSelectAll = document.querySelector("#chkSelectAll");
const btnDeleteAudio = document.querySelector("#btnDeleteAudio");
const btnSelectAudioDir = document.querySelector("#btnSelectAudioDir");

const btnResetMeta = document.querySelector("#btnResetMeta");
const btnSaveMeta = document.querySelector("#btnSaveMeta");

const frmMeta = document.querySelector("#frmMeta");
const metaFields = frmMeta.elements;
const spnMetaPath = document.querySelector("#spnMetaPath");

let chipGrpAudioType, chipGrpAudioLanguage, chipGrpAudioPosition;
let audioListGroup;
let chipGrpMetaType, chipGrpMetaLanguage, chipGrpMetaPosition;

const filters = {
  types: [],
  languages: [],
  positions: [],
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

async function getAudioList() {
  return await api.post("/audio/api/list-audio", filters);
}

// -----------------------------------------------------------------------------
// event listeners
// -----------------------------------------------------------------------------

btnSelectAudioDir.addEventListener("click", async () => {
  const { dir, canceled } = await api.post("/audio/api/select-audio-dir");

  if (canceled) {
    return null;
  }

  await renderAudioList();
});

chkSelectAll.addEventListener("change", async (event) => {
  const isChecked = event.target.checked;

  if (isChecked) {
    audioListGroup.checkAll();
  } else {
    audioListGroup.uncheckAll();
  }
});

btnSaveMeta.addEventListener("click", async () => {
  const metaPath = spnMetaPath.textContent.trim();
  const meta = getMetaFormValue();

  const savedMeta = await api.post("/audio/api/save-meta", {
    metaPath,
    meta,
  });

  await setMetaFormValue(savedMeta);

  await renderAudioList();
});

btnResetMeta.addEventListener("click", async () => {
  const metaPath = spnMetaPath.textContent.trim();

  if (!metaPath) {
    return;
  }

  const { meta } = await api.post("/audio/api/load-meta", {
    metaPath,
  });

  await setMetaFormValue(metaPath, meta);
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

  // new list-group for audio files
  audioListGroup = new ItemList("#audioListEl", {
    textField: "base",
    valueField: "filePath",
    onSetItems: async (items) => {
      chkSelectAll.checked = false;
    },
    onChange: async (item, oldItem) => {
      await setMetaFormValue(item.metaPath, item.meta);
    },
    onCheckedChange: async (items) => {
      chkSelectAll.checked = items.length === audioListGroup.getItems().length;
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

// -----------------------------------------------------------------------------
// Render Audio List
// -----------------------------------------------------------------------------

async function renderAudioList() {
  const audios = await getAudioList();
  await audioListGroup.setItems(audios);
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

async function setMetaFormValue(metaPath, meta = {}) {
  spnMetaPath.textContent = metaPath ?? "";

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

  await chipGrpMetaType.select(meta.type ?? null);
  await chipGrpMetaLanguage.select(meta.language ?? null);
  await chipGrpMetaPosition.select(meta.position ?? null);
}

function getMetaFormValue() {
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
