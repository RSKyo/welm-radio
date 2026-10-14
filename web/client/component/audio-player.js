import { assertNonBlankString, assertNonNegative } from "./base/assert.js";
import {
  createElementByHTML,
  formatTime,
  getBySelector,
} from "./base/helper.js";
import { isNonNegative, isNullishOrEmpty } from "./base/is.js";
import { Elm } from "./base/elm.js";
import { Range } from "./range.js";

const AUDIO_PLAYER_TEMPLATE = `
<div>
  <audio class="audio-player-audio"></audio>

  <button
    type="button"
    class="audio-player-play icon-button"
    title="播放"
  >
    ▶
  </button>

  <div class="audio-player-main">
    <div class="audio-player-title"></div>

    <div class="audio-player-control">
      <span class="audio-player-current-time">0</span>
      <div class="audio-player-progress"></div>
      <span class="audio-player-duration">0</span>
    </div>
  </div>
</div>
`;

const audioPlayerTemplate = createElementByHTML(AUDIO_PLAYER_TEMPLATE);

export class AudioPlayer extends Elm {
  // state
  #title = "";
  #src = null;
  #volume = 1;

  // element
  #audioEl = null;
  #playButtonEl = null;
  #titleEl = null;
  #currentTimeEl = null;
  #progressEl = null;
  #durationEl = null;

  // component
  #progressRange = null;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "audio-player",
    });

    this.#init();
    this.#render();
    this.#bindEvents();
    this.#updateUIState();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption("title", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#title = value;
    });

    this.resolveOption("src", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      this.#src = value;
    });

    this.resolveOption("volume", (value, assertionSubject) => {
      assertNonNegative(value, assertionSubject);

      if (value > 1) {
        throw new Error(`${assertionSubject} must be between 0 and 1`);
      }

      this.#volume = value;
    });
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

  /* title */

  get title() {
    return this.#title;
  }

  set title(value) {
    assertNonBlankString(value, "title");

    if (value === this.#title) {
      return;
    }

    this.#title = value;

    this.#updateTitleUIState();
  }

  /* src */

  get src() {
    return this.#audioEl.currentSrc;
  }

  set src(value) {
    if (isNullishOrEmpty(value)) {
      this.#src = null;

      this.#audioEl.removeAttribute("src");
      this.#audioEl.load();

      this.#updateUIState();

      return;
    }

    assertNonBlankString(value, "src");

    this.#src = value;

    this.#audioEl.src = value;
    this.#audioEl.load();
  }

  /* current time */

  get currentTime() {
    return this.#audioEl.currentTime;
  }

  set currentTime(value) {
    assertNonNegative(value, "currentTime");

    this.#audioEl.currentTime = Math.min(value, this.duration);
  }

  /* volume */

  get volume() {
    return this.#audioEl.volume;
  }

  set volume(value) {
    assertNonNegative(value, "volume");

    if (value > 1) {
      throw new Error("volume must be between 0 and 1");
    }

    this.#volume = value;
    this.#audioEl.volume = value;
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
  // render
  // -----------------------------------------------------------------------------

  #render() {
  const wrapperEl = audioPlayerTemplate.cloneNode(true);

  const [
    audioEl,
    playButtonEl,
    titleEl,
    currentTimeEl,
    progressEl,
    durationEl,
  ] = getBySelector(
    wrapperEl,
    ".audio-player-audio",
    ".audio-player-play",
    ".audio-player-title",
    ".audio-player-current-time",
    ".audio-player-progress",
    ".audio-player-duration",
  );

  this.#audioEl = audioEl;
  this.#playButtonEl = playButtonEl;
  this.#titleEl = titleEl;
  this.#currentTimeEl = currentTimeEl;
  this.#progressEl = progressEl;
  this.#durationEl = durationEl;

  this.rootElement.append(...wrapperEl.childNodes);

  this.#progressRange = new Range(this.#progressEl, {
    min: 0,
    max: 1,
    step: 0.001,
    value: 0,
    fixed: 3,
    showThumb: true,
  });

  this.#audioEl.volume = this.#volume;

  if (this.#src != null) {
    this.#audioEl.src = this.#src;
    this.#audioEl.load();
  }
}

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.#audioEl, "loadedmetadata", () => {
      this.#updateUIState();
    });

    this.event.on(this.#audioEl, "durationchange", () => {
      this.#updateDurationUIState();
    });

    this.event.on(this.#audioEl, "timeupdate", () => {
      this.#updateTimeUIState();
    });

    this.event.on(this.#audioEl, "play", () => {
      this.#updatePlayButtonUIState();
    });

    this.event.on(this.#audioEl, "pause", () => {
      this.#updatePlayButtonUIState();
    });

    this.event.on(this.#audioEl, "ended", () => {
      this.#updatePlayButtonUIState();
      this.#updateTimeUIState();
    });

    this.event.on(this.#audioEl, "emptied", () => {
      this.#updateUIState();
    });

    this.event.on(this.#playButtonEl, "click", async () => {
      await this.toggle();
    });

    this.#progressRange.onChange = ({ value }) => {
      this.currentTime = value;
    };
  }

  // -----------------------------------------------------------------------------
  // update ui state
  // -----------------------------------------------------------------------------

  #updateUIState() {
    this.#updateTitleUIState();
    this.#updateDurationUIState();
    this.#updateTimeUIState();
    this.#updatePlayButtonUIState();
  }

  #updateTitleUIState() {
    this.#titleEl.textContent = this.#title;
    this.#titleEl.title = this.#title;
  }

  #updateDurationUIState() {
    const duration = this.duration;

    this.#durationEl.textContent = formatTime(duration);

    this.#progressRange.max = duration > 0 ? duration : 1;
  }

  #updateTimeUIState() {
    const currentTime = this.currentTime;

    this.#currentTimeEl.textContent = formatTime(currentTime);

    this.#progressRange.setValue(currentTime);
  }

  #updatePlayButtonUIState() {
    if (this.paused) {
      this.#playButtonEl.textContent = "▶";
      this.#playButtonEl.title = "播放";
    } else {
      this.#playButtonEl.textContent = "❚❚";
      this.#playButtonEl.title = "暂停";
    }
  }
}
