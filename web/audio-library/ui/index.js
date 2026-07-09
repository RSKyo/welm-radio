const filesPanel = document.querySelector("#filesPanel");
const fileItemTemplate = document.querySelector("#fileItemTemplate");
const rootButton = document.querySelector("#rootButton");
const refreshButton = document.querySelector("#refreshButton");

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
}


// #region Action: selectRoot

async function selectRoot() {
  const {root, canceled} = await window.api.post("/audio-library/api/select-root");

  if (canceled) {
    return null;
  }

  await listAudio();

  return root;
}

// #endregion Action: selectRoot

// #region Action: listAudio

async function listAudio() {
  const {list} = await window.api.get("/audio-library/api/list-audio");
console.log("listAudio", JSON.stringify(list, null, 2));
  renderFiles(list);
}

function renderFiles(list) {
  filesPanel.innerHTML = "";

  if (!list || list.length === 0) {
    filesPanel.appendChild(createEmptyView("No audio files"));
    return;
  }

  for (const file of list) {
    filesPanel.appendChild(createFileItem(file));
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