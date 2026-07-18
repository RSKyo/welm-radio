import { safeRun, api } from "/assets/global.js";
import { ChipGroup } from "/components/chip-group.js";
import { ListGroup } from "/components/list-group.js";

const rootButton = document.querySelector("#selectRootEl");
const checkAllEl = document.querySelector("#checkAllEl");
const typeItemTemplate = document.querySelector("#typeItemTemplate");
const audioItemTemplate = document.querySelector("#audioItemTemplate");

let typeChipGroup, audioListGroup;
const filters = {
  types: [],
};

// -----------------------------------------------------------------------------
// event listeners
// -----------------------------------------------------------------------------

rootButton.addEventListener("click", async () => {
  await safeRun(selectRoot);
});

checkAllEl.addEventListener("change", async (event) => {
  const isChecked = event.target.checked;

  if (isChecked) {
    audioListGroup.checkAll();
  } else {
    audioListGroup.uncheckAll();
  }
});

// -----------------------------------------------------------------------------
// init
// -----------------------------------------------------------------------------

await safeRun(init);

async function init() {
  // new chip-group for audio types
  typeChipGroup = new ChipGroup("#typeChipsEl", {
    textField: "label",
    valueField: "value",
    onChange: async (items) => {
      filters.types = items.map((item) => item.value);
      await listAudio();
    },
    onRenderItem: (item) => {
      const element =
        typeItemTemplate.content.firstElementChild?.cloneNode(true);
      const span = element.querySelector("span");

      span.textContent = item.label;

      return element;
    },
  });

  // new list-group for audio files
  audioListGroup = new ListGroup("#audioListEl", {
    textField: "base",
    valueField: "filePath",
    onSetItems: async (items) => {
      checkAllEl.checked = false;
    },
    onChange: async (item, oldItem) => {
      alert(JSON.stringify(item, null, 2));
    },
    onCheckedChange: async (items) => {
      checkAllEl.checked = items.length === audioListGroup.getItems().length;
    },
    onRenderItem: (item) => {
      const element =
        audioItemTemplate.content.firstElementChild?.cloneNode(true);
      const span = element.querySelector("span");

      span.textContent = item.base;

      return element;
    },
  });

  await listMetaType();
  await listAudio();
}

// -----------------------------------------------------------------------------
// Select Root
// -----------------------------------------------------------------------------

async function selectRoot() {
  const { root, canceled } = await api.post("/audio-library/api/select-root");

  if (canceled) {
    return null;
  }

  await listAudio();

  return root;
}

// -----------------------------------------------------------------------------
// List Meta Type
// -----------------------------------------------------------------------------

async function listMetaType() {
  const types = await api.get("/audio-library/api/list-meta-type");

  await typeChipGroup.setItems(types);
}

// -----------------------------------------------------------------------------
// List Audio
// -----------------------------------------------------------------------------

async function listAudio() {
  const audios = await api.post("/audio-library/api/list-audio", filters);

  await audioListGroup.setItems(audios);
}
