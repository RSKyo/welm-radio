import {
  on,
  createElementByHTML,
  closestElement,
  isEqualValue,
} from "./helper.js";

import { audioApi } from "../api/audio.api.js";

const STUDIO_AUDIO_PATHS_KEY = "studioAudioPaths";

const AUDIO_TEMPLATE = `
<div class="audio">
  <div class="audio-content">
    <span class="audio-text"></span>
  </div>
  <button class="audio-remove" title="移除">×</button>
</div>
`;

const audioTemplate = createElementByHTML(AUDIO_TEMPLATE);

export async function setup({ audioMap, audioListEl } = {}) {
  on(window, "storage", localStorageChange);
  on(audioListEl, "click", audioListClickHandler);

  await listLocalStorageAudios();

  function localStorageChange(event) {
    if (event.storageArea !== localStorage) {
      return;
    }

    if (event.key !== STUDIO_AUDIO_PATHS_KEY) {
      return;
    }

    listLocalStorageAudios();
  }

  async function listLocalStorageAudios() {
    audioMap.clear();

    const audioPaths = getLocalStorage(STUDIO_AUDIO_PATHS_KEY) || [];
    if (audioPaths.length === 0) {
      renderAudios();
      return;
    }

    const audios = await audioApi.listAudiosByPaths(audioPaths);
    for (const audio of audios) {
      audioMap.set(audio.audioPath, audio);
    }

    const newAudioPaths = Array.from(audios.map((audio) => audio.audioPath));

    if(!isEqualValue(audioPaths, newAudioPaths)) {
      setLocalStorage(STUDIO_AUDIO_PATHS_KEY, newAudioPaths);
    }

    renderAudios();
  }

  function renderAudios() {
    audioListEl.innerHTML = "";

    for (const audio of audioMap.values()) {
      const audioEl = audioTemplate.cloneNode(true);
      audioEl.dataset.audioPath = audio.audioPath;
      const textEl = audioEl.querySelector(".audio-text");
      textEl.textContent = audio.text;
      textEl.title = audio.text;
      audioListEl.append(audioEl);
    }
  }

  function audioListClickHandler(event) {
    if (event.target.classList.contains("audio-remove")) {
      const audioEl = closestElement(event, ".audio");
      const audioPath = audioEl.dataset.audioPath;

      const audioPaths = getLocalStorage(STUDIO_AUDIO_PATHS_KEY) || [];
      const newAudioPaths = audioPaths.filter((item) => item !== audioPath);
      setLocalStorage(STUDIO_AUDIO_PATHS_KEY, newAudioPaths);

      audioMap.delete(audioPath);
      audioEl.remove();
    }
  }

   function getLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

 function setLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
}
