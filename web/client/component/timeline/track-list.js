import { assertNonBlankString } from "../base/assert.js";
import {
  createElementByHTML,
  isEqualValue,
  filterValue,
  getBySelector,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { ClipGroup } from "./clip-group.js";

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

    const durationByType = new Map();

    for (const clipElm of clipGroupElm.getClips()) {
      const type = clipElm.type;
      const duration = clipElm.duration;

      durationByType.set(type, (durationByType.get(type) ?? 0) + duration);
    }

    let dominantType = null;
    let longestDuration = -1;

    for (const [type, duration] of durationByType) {
      if (duration > longestDuration) {
        longestDuration = duration;
        dominantType = type;
      }
    }

    return dominantType;
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

    clipGroupElm.onClipsChange(() => {
      this.#updateTrackType(trackId);
    });

    this.#clipGroupMap.set(trackId, clipGroupElm);

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
      this.#updateTrackType(trackId);
    }
  }

  // override
  afterRenderAddedItem(addedItem) {
    this.#updateTimelineDuration();

    const trackId = addedItem[this.valueField];
    this.#updateTrackType(trackId);
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

  #updateTrackType(trackId) {
    const trackEl = this.getItemElement(trackId);

    const type = this.getTrackDominantAudioType(trackId);
    if (type) {
      this.setDataset("type", type, trackEl);
    }
  }
}
