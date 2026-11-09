import { assertNonBlankString } from "../base/assert.js";
import {
  createElementByHTML,
  isEqualValue,
  filterValue,
  getBySelector,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { ClipGroup } from "./clip-group.js";

const TRACK_TITLE_HEIGHT = 18;

const audioTypeColorTheme = {
  voice: "sky",
  music: "lavender",
  bed: "mint",
  ambience: "cyan",
  effect: "peach",
  jingle: "lemon",
  mixed: "slateLavender",
};

const colorThemes = {
  default: {
    track: "#E0E6EB",
    trackHover: "#D8E0E6",
    trackSelected: "#EAF0F4",
    trackSelectedHover: "#E2E9EE",
    trackBorder: "#BCC8D1",
    trackTitle: "#526575",
    clipRowLine: "#D3DCE3",
  },

  sky: {
    track: "#DFEBF1",
    trackHover: "#D6E5ED",
    trackSelected: "#EAF3F7",
    trackSelectedHover: "#E1EDF3",
    trackBorder: "#B8D0DC",
    trackTitle: "#456D80",
    clipRowLine: "#D3E3EA",
  },

  lavender: {
    track: "#E8E1EF",
    trackHover: "#E0D8E9",
    trackSelected: "#F2EDF6",
    trackSelectedHover: "#EAE3F0",
    trackBorder: "#CFC2DC",
    trackTitle: "#705986",
    clipRowLine: "#E1D8EB",
  },

  mint: {
    track: "#E0EBE4",
    trackHover: "#D7E5DD",
    trackSelected: "#EAF3ED",
    trackSelectedHover: "#E1ECE5",
    trackBorder: "#BFD5C8",
    trackTitle: "#466E57",
    clipRowLine: "#D5E5DB",
  },

  cyan: {
    track: "#DDEAE9",
    trackHover: "#D4E4E3",
    trackSelected: "#E9F2F1",
    trackSelectedHover: "#E0ECEB",
    trackBorder: "#B9D4D2",
    trackTitle: "#426F6D",
    clipRowLine: "#D1E3E1",
  },

  peach: {
    track: "#F0E4DA",
    trackHover: "#E9D9CC",
    trackSelected: "#F7EEE7",
    trackSelectedHover: "#EFE3D9",
    trackBorder: "#E1C5B1",
    trackTitle: "#8C5434",
    clipRowLine: "#EED9CA",
  },

  lemon: {
    track: "#ECEAD8",
    trackHover: "#E5E1CC",
    trackSelected: "#F5F3E6",
    trackSelectedHover: "#ECE9D9",
    trackBorder: "#DAD4AF",
    trackTitle: "#716A37",
    clipRowLine: "#E7E3C9",
  },

  slateLavender: {
    track: "#E2E4EC",
    trackHover: "#D9DCE7",
    trackSelected: "#EEF0F5",
    trackSelectedHover: "#E5E7EF",
    trackBorder: "#C7C9D9",
    trackTitle: "#59617E",
    clipRowLine: "#DADCE8",
  },
};

const TRACK_TEMPLATE = `
<div class="track" data-role="track">
  <div class="track-header">
    <div class="track-title" data-role="track-title"></div>
  </div>

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

    this.rootElement.style.setProperty(
      "--track-title-height",
      `${TRACK_TITLE_HEIGHT}px`,
    );
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

  getTrackDominantAudioType(trackId) {
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

  // onTrackHeightChange(handler) {
  //   return this.handler.on("trackHeightChangeHandler", handler);
  // }

  // #emitTrackHeightChange(value, height) {
  //   this.handler.emit("trackHeightChangeHandler", {
  //     elm: this,
  //     value,
  //     height,
  //   });
  // }

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

    const titleEl = getBySelector(trackEl, '[data-role="track-title"]');
    titleEl.textContent = item.title ?? "Track";

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

    // clipGroupElm.onHeightChange(({ height }) => {
    //   const trackHeight = TRACK_TITLE_HEIGHT + height;

    //   trackEl.style.height = `${trackHeight}px`;

    //   this.#emitTrackHeightChange(trackId, trackHeight);
    // });

    clipGroupElm.onClipsChange(() => {
      this.#updateTrackColor(trackId);
    });

    this.#clipGroupMap.set(trackId, clipGroupElm);

    // set initial track height based on clip group height
    // when new clip group is created, it has an initial height that should be applied to the track element
    trackEl.style.height = `${TRACK_TITLE_HEIGHT + clipGroupElm.height}px`;

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
  afterRenderAddedItem(addedItem) {
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

    const type = this.getTrackDominantAudioType(trackId);

    const themeName = audioTypeColorTheme[type] ?? "default";

    const colors = colorThemes[themeName];

    // track colors
    trackEl.style.setProperty("--color-track", colors.track);
    trackEl.style.setProperty("--color-track-hover", colors.trackHover);
    trackEl.style.setProperty("--color-track-selected", colors.trackSelected);
    trackEl.style.setProperty(
      "--color-track-selected-hover",
      colors.trackSelectedHover,
    );
    trackEl.style.setProperty("--color-track-border", colors.trackBorder);
    trackEl.style.setProperty("--color-track-title", colors.trackTitle);
    trackEl.style.setProperty("--color-clip-row-line", colors.clipRowLine);
  }
}
