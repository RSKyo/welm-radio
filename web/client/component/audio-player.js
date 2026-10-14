import {
  assertNonBlankString,
  assertNonNegative,
  assertValueIn,
} from "./base/assert.js";
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

  <div class="audio-player-top">
    <div class="audio-player-top-left">
      <div class="audio-player-title">
        <div class="audio-player-title-text"></div>
      </div>
    </div>

    <div class="audio-player-top-center">
      <button
        type="button"
        class="audio-player-play"
        title="播放"
      >
        ▶
      </button>
    </div>

    <div class="audio-player-top-right">
      <div class="audio-player-time">
        <span class="audio-player-current-time">0</span>
        <span>/</span>
        <span class="audio-player-duration-time">0</span>
      </div>
    </div>
  </div>

  <div class="audio-player-progress"></div>
</div>
`;

const audioPlayerTemplate = createElementByHTML(AUDIO_PLAYER_TEMPLATE);

export class AudioPlayer extends Elm {
  // state
  #title = "";
  #src = null;
  #volume = 1;
  #rootClassExtra = null;
  // element
  #audioEl = null;

  #titleEl = null;
  #titleTextEl = null;
  #playButtonEl = null;
  #timeEl = null;
  #currentTimeEl = null;
  #durationTimeEl = null;
  #progressEl = null;

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

    this.resolveOption("rootClassExtra", (value, assertionSubject) => {
      assertNonBlankString(value, assertionSubject);
      assertValueIn(value, ["sm", "xs"], assertionSubject);

      this.#rootClassExtra = value;
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

    this.#updatePlayButtonUIState();
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
      titleEl,
      titleTextEl,
      playButtonEl,
      timeEl,
      currentTimeEl,
      durationTimeEl,
      progressEl,
    ] = getBySelector(
      wrapperEl,
      ".audio-player-audio",
      ".audio-player-title",
      ".audio-player-title-text",
      ".audio-player-play",
      ".audio-player-time",
      ".audio-player-current-time",
      ".audio-player-duration-time",
      ".audio-player-progress",
    );

    this.#audioEl = audioEl;
    this.#titleEl = titleEl;
    this.#titleTextEl = titleTextEl;
    this.#playButtonEl = playButtonEl;
    this.#timeEl = timeEl;
    this.#currentTimeEl = currentTimeEl;
    this.#durationTimeEl = durationTimeEl;
    this.#progressEl = progressEl;

    this.rootElement.append(...wrapperEl.childNodes);

    const rangeOptions = {
      min: 0,
      max: 1,
      step: 0.001,
      value: 0,
      fixed: 3,
      showThumb: true,
    };

    if (this.#rootClassExtra != null) {
      rangeOptions.rootClassExtra = this.#rootClassExtra;
    }

    this.#progressRange = new Range(this.#progressEl, rangeOptions);

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
    this.onResize = () => {
      this.#updateTitleScrollingUIState();
    };

    this.event.on(this.#audioEl, "loadedmetadata", () => {
      this.#updateUIState();
    });

    this.event.on(this.#audioEl, "durationchange", () => {
      this.#updateDurationUIState();
    });

    this.event.on(this.#audioEl, "timeupdate", () => {
      this.#updateCurrentTimeUIState();
    });

    this.event.on(this.#audioEl, "play", () => {
      this.#updatePlayButtonUIState();
    });

    this.event.on(this.#audioEl, "pause", () => {
      this.#updatePlayButtonUIState();
    });

    this.event.on(this.#audioEl, "ended", () => {
      this.#updatePlayButtonUIState();
      this.#updateCurrentTimeUIState();
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
    this.#updateTimeUIState();
    this.#updatePlayButtonUIState();
  }

  #updateTitleUIState() {
    this.#titleTextEl.textContent = this.#title;
    this.#titleEl.title = this.#title;

    this.#updateTitleScrollingUIState();
  }

  #updateTitleScrollingUIState() {
    const scrolling = this.#titleTextEl.scrollWidth > this.#titleEl.clientWidth;

    this.#titleTextEl.classList.toggle("scrolling", scrolling);
  }

  #updateTimeUIState() {
    if (this.#src == null) {
      this.#timeEl.style.display = "none";
      return;
    }

    this.#timeEl.style.display = "";

    this.#updateDurationUIState();
    this.#updateCurrentTimeUIState();
  }

  #updateDurationUIState() {
    const duration = this.duration;

    this.#durationTimeEl.textContent = formatTime(duration);

    this.#progressRange.max = duration > 0 ? duration : 1;
  }

  #updateCurrentTimeUIState() {
    const currentTime = this.currentTime;

    this.#currentTimeEl.textContent = formatTime(currentTime);

    this.#progressRange.setValue(currentTime);
  }

  #updatePlayButtonUIState() {
    const disabled = this.#src == null;

    this.#playButtonEl.disabled = disabled;
    this.#progressRange.disabled = disabled;

    if (disabled) {
      this.#playButtonEl.textContent = "▶";
      this.#playButtonEl.title = "";
      return;
    }

    if (this.paused) {
      this.#playButtonEl.textContent = "▶";
      this.#playButtonEl.title = "播放";
    } else {
      this.#playButtonEl.textContent = "❚❚";
      this.#playButtonEl.title = "暂停";
    }
  }
}
