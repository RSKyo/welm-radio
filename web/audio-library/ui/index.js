const rootButton = document.querySelector("#rootButton");
const refreshButton = document.querySelector("#refreshButton");
const metaTypeList = document.querySelector("#metaTypeList");
const metaTypeTemplate = document.querySelector("#metaTypeTemplate");
const fileList = document.querySelector("#fileList");
const fileItemTemplate = document.querySelector("#fileItemTemplate");

const filters = {
  type: "",
};

// -----------------------------------------------------------------------------
// event listeners
// -----------------------------------------------------------------------------

rootButton.addEventListener("click", async () => {
  await window.runAction(selectRoot);
});

refreshButton.addEventListener("click", async () => {
  await window.runAction(listAudio);
});

// -----------------------------------------------------------------------------
// init
// -----------------------------------------------------------------------------

init();

async function init() {
  await window.runAction(listAudio);
  await window.runAction(listMetaType);
}

// #region Action: selectRoot

async function selectRoot() {
  const { root, canceled } = await window.api.post(
    "/audio-library/api/select-root",
  );

  if (canceled) {
    return null;
  }

  await listAudio();

  return root;
}

// #endregion Action: selectRoot

// #region Action: listMetaType

async function listMetaType() {
  const { list } = await window.api.get("/audio-library/api/list-meta-type");

  renderChips("#metaTypeList", list, {
    itemTemplateSelector: "#metaTypeTemplate",
  });
}

function renderChips(containerSelector, chips = [], options = {}) {
  const { clickHandler } = options;

  const container = document.querySelector(containerSelector);

  if (!container) {
    throw new Error(`container not found: ${containerSelector}`);
  }

  container._chipClickHandler = clickHandler;

  if (clickHandler && container.dataset.clickBound !== "true") {
    container.addEventListener("click", async (event) => {
      const target = event.target.closest(".chip");

      if (!target || !container.contains(target)) {
        return;
      }

      await container._chipClickHandler?.(target, event);
    });

    container.dataset.clickBound = "true";
  }

  container.innerHTML = "";

  for (const chip of chips) {
    container.appendChild(createChip(chip, options));
  }
}

function createChip(chip, options = {}) {
  const { itemTemplateSelector } = options;

  const itemElement = itemTemplateSelector
    ? createElementFromTemplate(itemTemplateSelector)
    : createChipElement();

  itemElement.textContent = chip.label;
  itemElement.dataset.value = chip.value;

  return itemElement;
}

function createChipElement() {
  const itemElement = document.createElement("span");

  itemElement.classList.add("chip");

  return itemElement;
}

function createElementFromTemplate(templateSelector) {
  const template = document.querySelector(templateSelector);

  if (!template) {
    throw new Error(`template not found: ${templateSelector}`);
  }

  const element = template.content.firstElementChild?.cloneNode(true);

  if (!element) {
    throw new Error(`template is empty: ${templateSelector}`);
  }

  return element;
}







function toggleTypeFilter(type) {
  if (filters.type === type) {
    filters.type = "";
  } else {
    filters.type = type;
  }
}

function updateMetaTypeActiveState() {
  const chips = metaTypeList.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.value === filters.type);
  });
}

// #endregion Action: listMetaType

// #region Action: listAudio

async function listAudio() {
  const { list } = await window.api.post(
    "/audio-library/api/list-audio",
    filters,
  );

  renderFiles(list);
}

function renderFiles(list) {
  fileList.innerHTML = "";

  if (!list || list.length === 0) {
    fileList.appendChild(createEmptyView("No audio files"));
    return;
  }

  for (const file of list) {
    fileList.appendChild(createFileItem(file));
  }
}

function createFileItem(file) {
  const fragment = fileItemTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".file-item");
  const fileName = fragment.querySelector(".file-name");

  fileName.textContent = file.base;
  fileName.title = file.filePath;

  item.dataset.filePath = file.filePath;
  item.dataset.metaPath = file.metaPath;

  return fragment;
}

// #endregion Action: listAudio

function createEmptyView(text) {
  const empty = document.createElement("div");

  empty.className = "empty";
  empty.textContent = text;

  return empty;
}
