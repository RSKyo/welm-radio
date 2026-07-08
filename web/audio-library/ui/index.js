rootButton.addEventListener("click", async () => {
  await window.runAction(selectRoot);
});

refreshButton.addEventListener("click", async () => {
  await window.runAction(listAudio);
});

async function selectRoot() {
  const {root, canceled} = await window.api.post("/audio-library/api/select-root");

  if (canceled) {
    return null;
  }

  await listAudio();
}

async function listAudio() {
  const {list} = await window.api.get("/audio-library/api/list-audio");

  // 接下来在filesPanel中显示这些文件
}
