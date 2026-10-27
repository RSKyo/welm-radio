import { assertNonBlankString, assertNonNegative } from "../base/assert.js";
import {
  createElementByHTML,
  isEqualValue,
  filterValue,
  getBySelector,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { ClipGroup, DEFAULT_CLIP_GROUP_MIN_HEIGHT } from "./clip-group.js";

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
    this.resolveOption("timelineRuler", (value) => {
      this.#timelineRuler = value;
    });

    if (this.#timelineRuler == null) {
      throw new Error("Timeline ruler not found");
    }

    this.resolveOption("timelinePlayhead", (value) => {
      this.#timelinePlayhead = value;
    });

    if (this.#timelinePlayhead == null) {
      throw new Error("Timeline playhead not found");
    }

    this.resolveOption("audioCache", (value) => {
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
  // methods
  // -----------------------------------------------------------------------------

  #updateTimelineDuration() {
    let maxDuration = 0;

    for (const clipGroupElm of this.#clipGroupMap.values()) {
      maxDuration = Math.max(maxDuration, clipGroupElm.duration);
    }

    this.#timelineRuler.duration = maxDuration;
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
  // clip group operations
  // -----------------------------------------------------------------------------

  findClipGroup(trackId) {
    if (trackId == null) {
      return null;
    }

    return this.#clipGroupMap.get(trackId) ?? null;
  }

  findSelectedClipGroup() {
    return this.findClipGroup(this.#selectedTrackId);
  }

  // -----------------------------------------------------------------------------
  // clip operations
  // -----------------------------------------------------------------------------

  findClip(clipId) {
    for (const clipGroupElm of this.#clipGroupMap.values()) {
      const clipElm = clipGroupElm.findClip(clipId);
      if (clipElm != null) {
        return clipElm;
      }
    }

    return null;
  }

  addClip(clip) {
    const clipGroupElm = this.findSelectedClipGroup();
    if (clipGroupElm == null) {
      return "track-not-selected";
    }

    clipGroupElm.addClip(clip);
    return "success";
  }

  splitClip() {
    const clipGroupElm = this.findSelectedClipGroup();
    if (clipGroupElm == null) {
      return "track-not-selected";
    }

    const clipElm = clipGroupElm.findSelectedClip();
    if (clipElm == null) {
      return "clip-not-selected";
    }

    return clipGroupElm.splitClip();
  }

  removeClip() {
    const clipGroupElm = this.findSelectedClipGroup();
    if (clipGroupElm == null) {
      return "track-not-selected";
    }

    const clipElm = clipGroupElm.findSelectedClip();
    if (clipElm == null) {
      return "clip-not-selected";
    }

    return clipGroupElm.removeClip();
  }

  duplicateClip() {
    const clipGroupElm = this.findSelectedClipGroup();
    if (clipGroupElm == null) {
      return "track-not-selected";
    }

    const clipElm = clipGroupElm.findSelectedClip();
    if (clipElm == null) {
      return "clip-not-selected";
    }

    return clipGroupElm.duplicateClip();
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

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onSelectedChange(handler) {
    this.handler.on("selectedChangeHandler", handler);
  }

  #emitSelectedChange(value) {
    this.handler.emit("selectedChangeHandler", {
      elm: this,
      value,
    });
  }

  set onTrackHeightChange(handler) {
    this.handler.on("trackHeightChangeHandler", handler);
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
    this.event.on(this.rootElement, "click", this.#trackClickHandler, {
      selector: '[data-role="track"]',
    });

    this.#timelineRuler.onWidthChange = () => {
      this.#updateWidthUIState();
    };
  }

  #trackClickHandler = (event, { element }) => {
    const trackId = element.dataset.value;
    this.#setSelectedTrackId(trackId);
  };

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  createItemElement(item) {
    const trackId = item[this.valueField];

    const itemEl = trackTemplate.cloneNode(true);
    itemEl.dataset.value = trackId;

    const clipGroupEl = getBySelector(itemEl, '[data-role="clip-group"]');

    const clipGroupElm = new ClipGroup(clipGroupEl, {
      trackId: item[this.valueField],
      timelineRuler: this.#timelineRuler,
      timelinePlayhead: this.#timelinePlayhead,
      audioCache: this.#audioCache,
      dataset: {
        trackId: trackId,
      },
    });

    clipGroupElm.onSelectedChange = ({ trackId }) => {
      for (const clipGroupElm of this.#clipGroupMap.values()) {
        if (clipGroupElm.trackId !== trackId) {
          clipGroupElm.unselect();
        }
      }
    };

    clipGroupElm.onDurationChange = () => {
      this.#updateTimelineDuration();
    };

    clipGroupElm.onHeightChange = ({ height }) => {
      itemEl.style.height = `${height}px`;

      this.#emitTrackHeightChange(trackId, height);
    };

    this.#clipGroupMap.set(trackId, clipGroupElm);

    return itemEl;
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
    this.#updateSelectedUIState();
  }

  // override
  afterRenderItem(addedItem) {
    this.#updateTimelineDuration();
  }

  // override
  afterRenderUpdatedItem(updatedItem) {
    this.#updateTimelineDuration();
  }

  // override
  afterRenderRemovedItem(removedItem) {
    this.#updateTimelineDuration();
    this.#updateSelectedUIState();
  }

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

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
}
