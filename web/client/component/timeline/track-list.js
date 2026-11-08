import { assertNonBlankString } from "../base/assert.js";
import {
  createElementByHTML,
  isEqualValue,
  filterValue,
  getBySelector,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { ClipGroup } from "./clip-group.js";

const trackColorThemes = {
  default: {
    track: "#e8ecef",
    trackHover: "#e2e7eb",
    trackSelected: "#f2f5f7",
    trackSelectedHover: "#ebeff2",
    trackBorder: "#d1d8de",
  },

  sky: {
    track: "#e7f0f4",
    trackHover: "#e0e9ee",
    trackSelected: "#eef5f8",
    trackSelectedHover: "#e8f0f4",
    trackBorder: "#ccdbe2",
  },

  lavender: {
    track: "#eee9f3",
    trackHover: "#e8e1ee",
    trackSelected: "#f4f0f7",
    trackSelectedHover: "#eee8f3",
    trackBorder: "#d8cde1",
  },

  mint: {
    track: "#e8f1ec",
    trackHover: "#e1ebe5",
    trackSelected: "#eff6f2",
    trackSelectedHover: "#e9f2ed",
    trackBorder: "#ceddd4",
  },

  cyan: {
    track: "#e5efef",
    trackHover: "#deeaeb",
    trackSelected: "#edf5f5",
    trackSelectedHover: "#e7f1f1",
    trackBorder: "#cadadb",
  },

  peach: {
    track: "#f3ece7",
    trackHover: "#ede4dd",
    trackSelected: "#f8f2ee",
    trackSelectedHover: "#f2ebe6",
    trackBorder: "#dfd0c5",
  },

  lemon: {
    track: "#f0efe4",
    trackHover: "#ebe9dc",
    trackSelected: "#f6f4e9",
    trackSelectedHover: "#f1eee1",
    trackBorder: "#d8d4bd",
  },

  slateLavender: {
    track: "#e9eaf0",
    trackHover: "#e2e4eb",
    trackSelected: "#f1f2f6",
    trackSelectedHover: "#ebedf2",
    trackBorder: "#d2d4de",
  },
};

const audioTypeTrackColorTheme = {
  voice: "sky",
  music: "lavender",
  bed: "mint",
  ambience: "cyan",
  effect: "peach",
  jingle: "lemon",
  mixed: "slateLavender",
};

const TRACK_TEMPLATE = `
<div class="track" data-role="track">
  <div data-role="clip-group">
  </div>
</div>
`;

const trackTemplate = createElementByHTML(TRACK_TEMPLATE);

export class TrackList extends ItemsElm {
  #selectedTrackId = null;
  #clipGroupMap = new Map();
  // ruler
  #timelineRuler = null;
  // playhead
  #timelinePlayhead = null;

  // audio cache
  #audioCache = null;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "track-list",
      valueField: "trackId",
    });

    this.#init();
    this.#bindEvents();
    this.#updateWidthUIState();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.applyRequiredOption("timelineRuler", (value) => {
      this.#timelineRuler = value;
    });

    this.applyRequiredOption("timelinePlayhead", (value) => {
      this.#timelinePlayhead = value;
    });

    this.applyOption("audioCache", (value) => {
      this.#audioCache = value;
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  /** selected trackId (read-write) */

  get selectedTrackId() {
    return this.#selectedTrackId;
  }

  set selectedTrackId(trackId) {
    assertNonBlankString(trackId, "selectedTrackId");
    this.#setSelectedTrackId(trackId);
  }

  #setSelectedTrackId(trackId, { updateUI = true, emitEvent = true } = {}) {
    if (isEqualValue(trackId, this.#selectedTrackId)) {
      return;
    }

    this.#selectedTrackId = trackId;

    if (updateUI) {
      this.#updateSelectedUIState();
    }

    if (emitEvent) {
      this.#emitSelectedChange(trackId);
    }
  }

  // -----------------------------------------------------------------------------
  // queries / access
  // -----------------------------------------------------------------------------

  getClipGroup(trackId) {
    assertNonBlankString(trackId, "trackId");
    return this.#clipGroupMap.get(trackId) ?? null;
  }

  getSelectedClipGroup() {
    if (this.#selectedTrackId == null) {
      return null;
    }
    return this.#clipGroupMap.get(this.#selectedTrackId) ?? null;
  }

  getSnapPoints() {
    const snapPoints = [];

    for (const [trackId, clipGroupElm] of this.#clipGroupMap.entries()) {
      for (const clipGroupSnapPoint of clipGroupElm.getSnapPoints()) {
        snapPoints.push({
          ...clipGroupSnapPoint,
          trackId,
        });
      }
    }

    return snapPoints;
  }

  getTrackAudioType(trackId) {
    const clipGroupElm = this.getClipGroup(trackId);

    if (clipGroupElm == null) {
      return null;
    }

    let longestDuration = -1;
    let audioType = null;

    for (const clipElm of clipGroupElm.getClips()) {
      const duration = clipElm.duration;

      if (duration > longestDuration) {
        longestDuration = duration;
        audioType = clipElm.type;
      }
    }

    return audioType;
  }

  // -----------------------------------------------------------------------------
  // track operations
  // -----------------------------------------------------------------------------

  addTrack(track) {
    return this.addItem(track);
  }

  removeTrack(trackValue) {
    return this.removeItem(trackValue);
  }

  // -----------------------------------------------------------------------------
  // clip operations
  // -----------------------------------------------------------------------------

  addClip(clip) {
    const clipGroupElm = this.getSelectedClipGroup();
    if (clipGroupElm == null) {
      return "track-not-selected";
    }

    clipGroupElm.addClip(clip);
    return "success";
  }

  duplicateClip() {
    const clipGroupElm = this.getSelectedClipGroup();
    if (clipGroupElm == null) {
      return "track-not-selected";
    }

    return clipGroupElm.duplicateClip();
  }

  splitClip() {
    const clipGroupElm = this.getSelectedClipGroup();
    if (clipGroupElm == null) {
      return "track-not-selected";
    }

    return clipGroupElm.splitClip();
  }

  removeClip() {
    const clipGroupElm = this.getSelectedClipGroup();
    if (clipGroupElm == null) {
      return "track-not-selected";
    }

    return clipGroupElm.removeClip();
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  onSelectedChange(handler) {
    return this.handler.on("selectedChangeHandler", handler);
  }

  #emitSelectedChange(value) {
    this.handler.emit("selectedChangeHandler", {
      elm: this,
      value,
    });
  }

  onTrackHeightChange(handler) {
    return this.handler.on("trackHeightChangeHandler", handler);
  }

  #emitTrackHeightChange(value, height) {
    this.handler.emit("trackHeightChangeHandler", {
      elm: this,
      value,
      height,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.registerOffHandler(
      this.#timelineRuler.onWidthChange(() => {
        this.#updateWidthUIState();
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  createItemElement(item) {
    /** create track */

    const trackId = item[this.valueField];
    const trackEl = trackTemplate.cloneNode(true);
    trackEl.dataset.value = trackId;

    /** create clip group */

    const clipGroupEl = getBySelector(trackEl, '[data-role="clip-group"]');

    const clipGroupElm = new ClipGroup(clipGroupEl, {
      trackId,
      timelineRuler: this.#timelineRuler,
      timelinePlayhead: this.#timelinePlayhead,
      audioCache: this.#audioCache,
      dataset: {
        trackId,
      },
    });

    clipGroupElm.onSelectedChange(() => {
      for (const clipGroupElm of this.#clipGroupMap.values()) {
        if (clipGroupElm.trackId !== trackId) {
          clipGroupElm.unselect();
        }
      }

      if (this.#selectedTrackId !== trackId) {
        this.#setSelectedTrackId(trackId);
      }
    });

    clipGroupElm.onDurationChange(() => {
      this.#updateTimelineDuration();
    });

    clipGroupElm.onHeightChange(({ height }) => {
      trackEl.style.height = `${height}px`;

      this.#emitTrackHeightChange(trackId, height);
    });

    clipGroupElm.onClipsChange(() => {
      this.#updateTrackColor(trackId);
    });

    this.#clipGroupMap.set(trackId, clipGroupElm);

    // set initial track height based on clip group height
    // when new clip group is created, it has an initial height that should be applied to the track element
    trackEl.style.height = `${clipGroupElm.height}px`;

    /** create clip */

    if (item.clips) {
      clipGroupElm.setItems(item.clips);
    }

    return trackEl;
  }

  // override
  afterSetItems(items) {
    const selectedTrackId = filterValue(this.#selectedTrackId, this.itemValues);
    this.#setSelectedTrackId(selectedTrackId, { updateUI: false });

    // clear all clipGroupElm
    for (const clipGroupElm of this.#clipGroupMap.values()) {
      clipGroupElm.destroy();
    }
    this.#clipGroupMap.clear();
  }

  // do nothing for afterAddItem
  // afterAddItem(addedItem) {}

  // override
  afterUpdateItem(updatedItem) {
    const trackId = updatedItem[this.valueField];

    const clipGroupMap = this.#clipGroupMap;
    const clipGroupElm = clipGroupMap.get(trackId);
    clipGroupElm.destroy();
    clipGroupMap.delete(trackId);
  }

  // override
  afterRemoveItem(removedItem) {
    const selectedTrackId = filterValue(this.#selectedTrackId, this.itemValues);
    this.#setSelectedTrackId(selectedTrackId, { updateUI: false });

    const trackId = removedItem[this.valueField];

    const clipGroupMap = this.#clipGroupMap;
    const clipGroupElm = clipGroupMap.get(trackId);
    clipGroupElm.destroy();
    clipGroupMap.delete(trackId);
  }

  // override
  afterRenderItems(items) {
    this.#updateTimelineDuration();
    this.#updateSelectedUIState();

    for (const item of items) {
      const trackId = item[this.valueField];
      this.#updateTrackColor(trackId);
    }
  }

  // override
  afterRenderItem(addedItem) {
    this.#updateTimelineDuration();

    const trackId = addedItem[this.valueField];
    this.#updateTrackColor(trackId);
  }

  // override
  afterRenderUpdatedItem(updatedItem) {
    this.#updateTimelineDuration();
    this.#updateSelectedUIState();
  }

  // override
  afterRenderRemovedItem(removedItem) {
    this.#updateTimelineDuration();
    this.#updateSelectedUIState();
  }

  // ---------------------------------------------------------------------------
  // update methods
  // ---------------------------------------------------------------------------

  #updateTimelineDuration() {
    let maxDuration = 0;

    for (const clipGroupElm of this.#clipGroupMap.values()) {
      maxDuration = Math.max(maxDuration, clipGroupElm.duration);
    }

    this.#timelineRuler.duration = maxDuration;
  }

  #updateSelectedUIState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;
      const selected = this.#selectedTrackId === value;
      element.classList.toggle("is-selected", selected);
    });
  }

  #updateWidthUIState() {
    this.rootElement.style.width = `${this.#timelineRuler.width}px`;
  }

  #updateTrackColor(trackId) {
    const trackEl = this.getItemElement(trackId);

    const type = this.getTrackAudioType(trackId);

    const themeName = audioTypeTrackColorTheme[type] ?? "default";

    const colors = trackColorThemes[themeName];

    trackEl.style.setProperty("--color-track", colors.track);
    trackEl.style.setProperty("--color-track-hover", colors.trackHover);
    trackEl.style.setProperty("--color-track-selected", colors.trackSelected);
    trackEl.style.setProperty(
      "--color-track-selected-hover",
      colors.trackSelectedHover,
    );
    trackEl.style.setProperty("--color-track-border", colors.trackBorder);
  }
}
