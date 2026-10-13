import { Elm } from "../elm.js";
import { formatTime } from "../../time.js";
import { isNullishOrEmpty, isNonNegative } from "./base/is.js";
import {
  assertNonBlankString,
  assertNonNegative,
  isNonNegative,
} from "./base/assert.js";

const AUDIO_TEMPLATE = `
<audio class="audio-player-audio"></audio>
`;
const PLAY_BUTTON_TEMPLATE = `
<button type="button" class="audio-player-play icon-button" title="播放">
  ▶
</button>
`;
const CURRENT_TIME_TEMPLATE = `
<span class="audio-player-current-time">0</span>
`;
const PROGRESS_TEMPLATE = `
<input class="audio-player-progress" type="range"
  min="0"
  max="0"
  step="0.001"
  value="0"
  />
`;
const DURATION_TEMPLATE = `
<span class="audio-player-duration">0</span>
`;
const VOLUME_TEMPLATE = `
<input class="audio-player-volume" type="range"
  min="0"
  max="1"
  step="0.01"
  value="1"
  />
`;



const audioTemplate = createElementByHTML(AUDIO_TEMPLATE);
const playButtonTemplate = createElementByHTML(PLAY_BUTTON_TEMPLATE);
const currentTimeTemplate = createElementByHTML(CURRENT_TIME_TEMPLATE);
const progressTemplate = createElementByHTML(PROGRESS_TEMPLATE);
const durationTemplate = createElementByHTML(DURATION_TEMPLATE);
const volumeTemplate = createElementByHTML(VOLUME_TEMPLATE);



export class AudioPlayer extends Elm {
  #audioEl;

  #playButton;
  #currentTimeElement;
  #durationElement;
  #progressElement;
  #volumeElement;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "audio-player",
    });

    this.#render();
    this.#resolveElements();
    this.#bindEvents();
    this.#update();
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  get duration() {
    const duration = this.#audioEl.duration;

    return isNonNegative(duration) ? duration : 0;
  }

   get paused() {
    return this.#audioEl.paused;
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get src() {
    return this.#audioEl.currentSrc;
  }

  set src(value) {
    if (isNullishOrEmpty(value)) {
      this.#audioEl.removeAttribute("src");
      this.#audioEl.load();

      this.#update();

      return;
    }

    assertNonBlankString(value, "src");

    this.#audioEl.src = value;
    this.#audioEl.load();
  }

  get currentTime() {
    return this.#audioEl.currentTime;
  }

  set currentTime(value) {
    assertNonNegative(value, "currentTime");

    this.#audioEl.currentTime = value;
  }

  get volume() {
    return this.#audioEl.volume;
  }

  set volume(value) {
    assertNonNegative(value, "volume");

    if (value < 0 || value > 1) {
      throw new Error("volume must be a number between 0 and 1");
    }

    this.#audioEl.volume = value;
    this.#volumeElement.value = value;
  }

 

  // -----------------------------------------------------------------------------
  // playback
  // -----------------------------------------------------------------------------

  async play() {
    await this.#audioEl.play();
  }

  pause() {
    this.#audioEl.pause();
  }

  async toggle() {
    if (this.paused) {
      await this.play();
    } else {
      this.pause();
    }
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #render() {
    
  }

  #resolveElements() {
    this.#audioEl = this.rootElement.querySelector(".audio-player-audio");

    this.#playButton = this.rootElement.querySelector(".audio-player-play");

    this.#currentTimeElement = this.rootElement.querySelector(
      ".audio-player-current-time",
    );

    this.#durationElement = this.rootElement.querySelector(
      ".audio-player-duration",
    );

    this.#progressElement = this.rootElement.querySelector(
      ".audio-player-progress",
    );

    this.#volumeElement = this.rootElement.querySelector(
      ".audio-player-volume",
    );
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.on(this.#audioEl, "loadedmetadata", () => {
      this.#update();
    });

    this.on(this.#audioEl, "durationchange", () => {
      this.#updateDuration();
    });

    this.on(this.#audioEl, "timeupdate", () => {
      this.#updateTime();
    });

    this.on(this.#audioEl, "play", () => {
      this.#updatePlayButton();
    });

    this.on(this.#audioEl, "pause", () => {
      this.#updatePlayButton();
    });

    this.on(this.#audioEl, "ended", () => {
      this.#updatePlayButton();
      this.#updateTime();
    });

    this.on(this.#playButton, "click", async () => {
      await this.toggle();
    });

    this.on(this.#progressElement, "input", () => {
      this.currentTime = Number(this.#progressElement.value);
    });

    this.on(this.#volumeElement, "input", () => {
      this.volume = Number(this.#volumeElement.value);
    });
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #update() {
    this.#updateDuration();
    this.#updateTime();
    this.#updatePlayButton();
  }

  #updateDuration() {
    const duration = this.duration;

    this.#durationElement.textContent = formatTime(duration);
    this.#progressElement.max = duration;
  }

  #updateTime() {
    const currentTime = this.currentTime;

    this.#currentTimeElement.textContent = formatTime(currentTime);
    this.#progressElement.value = currentTime;
  }

  #updatePlayButton() {
    if (this.paused) {
      this.#playButton.textContent = "▶";
      this.#playButton.title = "播放";
    } else {
      this.#playButton.textContent = "❚❚";
      this.#playButton.title = "暂停";
    }
  }
}
