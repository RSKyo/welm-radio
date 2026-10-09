import {
  assertPlainObject,
  assertPositive,
  assertValueExists,
  assertValueForMode,
} from "../base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  isEqualValue,
  filterValue,
  getBySelector,
} from "../base/helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { CompactCombobox } from "../combobox.js";
import { CompactGainSlider, CompactPanSlider } from "../slider.js";
import { CompactToggleButton } from "../toggle-button.js";

const DEFAULT_TRACK_HEADER_MIN_HEIGHT = 132;

const ITEM_TEMPLATE = `
<div class="track-header" data-role="track-header">
  <div data-role="name" data-track-control></div>
  <div data-role="gain" data-track-control></div>
  <div data-role="pan" data-track-control></div>
  <div style="display: flex; gap: 4px;">
    <div style="flex: 1;" data-role="lock" data-track-control></div>
    <div style="flex: 1;" data-role="muted" data-track-control></div>
  </div>
</div>
`;

const itemTemplate = createElementByHTML(ITEM_TEMPLATE);

export class TrackHeaderList extends ItemsElm {
  // state
  #selectedValue = null;
  #selectedValueMode = 1;
  #itemElmsMap = new Map();

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "track-header-list",
      valueField: "trackId",
    });

    this.#init();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.rootElement.style.setProperty(
      "--track-header-height",
      `${DEFAULT_TRACK_HEADER_MIN_HEIGHT}px`,
    );
  }

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  /** selected value (read-write) */

  get selectedValue() {
    return normalizeValue(this.#selectedValue, this.#selectedValueMode);
  }

  set selectedValue(value) {
    assertValueForMode(value, this.#selectedValueMode);
    this.#setSelectedValue(value);
  }

  #setSelectedValue(value, { updateUI = true } = {}) {
    const oldValue = this.#selectedValue;
    const newValue = normalizeValue(value, this.#selectedValueMode);

    if (isEqualValue(newValue, oldValue)) {
      return;
    }

    this.#selectedValue = newValue;

    if (updateUI) {
      this.#updateSelectedUIState();
    }

    this.#emitSelectedChange(newValue);
  }

  // -----------------------------------------------------------------------------
  // methods
  // -----------------------------------------------------------------------------

  /**
   * Set the height of a track header item.
   */
  setTrackHeaderHeight(value, height) {
    const itemValues = this.itemValues;
    assertValueExists(value, itemValues);
    assertPositive(height);

    const element = this.getItemElement(value);
    element.style.height = `${height}px`;
  }

  // -----------------------------------------------------------------------------
  // registered events
  // -----------------------------------------------------------------------------

  set onSelectedChange(handler) {
    this.handler.set("selectedChangeHandler", handler);
  }

  #emitSelectedChange(value) {
    this.handler.emit("selectedChangeHandler", {
      elm: this,
      value,
    });
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.event.on(this.rootElement, "click", this.#itemClickHandler, {
      selector: '[data-role="track-header"]',
    });
  }

  /**
   * Do not rely on child controls calling stopPropagation() to prevent track
   * selection. Whether a click should select a track is a TrackHeaderList
   * interaction rule, not a responsibility of generic controls.
   *
   * Control-originated clicks are filtered here so sliders, comboboxes, and
   * toggle buttons can remain independent of TrackHeaderList behavior.
   */
  #itemClickHandler = (event, { element }) => {
    if (event.target.closest("[data-track-control]")) {
      return;
    }

    const value = element.dataset.value;

    if (this.#selectedValueMode === 1) {
      this.selectedValue = value;
      return;
    }

    const oldValue = this.#selectedValue ?? [];
    const newValue = oldValue.includes(value)
      ? oldValue.filter((v) => v !== value)
      : [...oldValue, value];

    this.selectedValue = newValue;
  };

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    const itemValues = this.itemValues;
    const newSelectedValue = filterValue(this.#selectedValue, itemValues);
    this.#setSelectedValue(newSelectedValue, { updateUI: false });

    // clear all item components
    for (const { name, gain, lock, muted, pan } of this.#itemElmsMap.values()) {
      name.destroy();
      gain.destroy();
      lock.destroy();
      muted.destroy();
      pan.destroy();
    }
    this.#itemElmsMap.clear();
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    const newSelectedValue = filterValue(this.#selectedValue, itemValues);
    this.#setSelectedValue(newSelectedValue, { updateUI: false });

    const { name, gain, lock, muted, pan } =
      this.#itemElmsMap.get(removedItem[this.valueField]) ?? {};
    name?.destroy();
    gain?.destroy();
    lock?.destroy();
    muted?.destroy();
    pan?.destroy();

    this.#itemElmsMap.delete(removedItem[this.valueField]);
  }

  // override
  afterUpdateItem(updatedItem) {
    const value = updatedItem[this.valueField];

    const { name, gain, lock, muted, pan } = this.#itemElmsMap.get(value) ?? {};

    name?.destroy();
    gain?.destroy();
    lock?.destroy();
    muted?.destroy();
    pan?.destroy();

    this.#itemElmsMap.delete(value);
  }

  // override
  createItemElement(item, assertionSubject = "item") {
    assertPlainObject(
      item,
      assertionSubject,
      this.valueField,
      "name",
      "gain",
      "locked",
      "muted",
      "pan",
    );

    const value = item[this.valueField];

    const itemEl = itemTemplate.cloneNode(true);
    itemEl.dataset.value = value;

    const [nameEl, gainEl, lockEl, mutedEl, panEl] = getBySelector(
      itemEl,
      '[data-role="name"]',
      '[data-role="gain"]',
      '[data-role="lock"]',
      '[data-role="muted"]',
      '[data-role="pan"]',
    );

    const nameElm = new CompactCombobox(nameEl, {
      items: getTrackNames(),
    });
    // nameElm.value = item.name;

    const gainSliderElm = new CompactGainSlider(gainEl, {
      labelText: "Gain",
    });
    gainSliderElm.value = gainSliderElm.gainToDb(item.gain);

    const panSliderElm = new CompactPanSlider(panEl, {
      labelText: "Pan",
      color: "var(--color-slider-pan)",
    });
    panSliderElm.value = item.pan;

    const lockToggleElm = new CompactToggleButton(lockEl, {
      activeValue: true,
      inactiveValue: false,
      activeText: "Locked",
      inactiveText: "Unlocked",
      color: "#B4A582",
    });
    lockToggleElm.value = item.locked;

    const mutedToggleElm = new CompactToggleButton(mutedEl, {
      activeValue: true,
      inactiveValue: false,
      activeText: "Muted",
      inactiveText: "Unmuted",
      color: "#A96360",
    });
    mutedToggleElm.value = item.muted;

    this.#itemElmsMap.set(value, {
      name: nameElm,
      gain: gainSliderElm,
      lock: lockToggleElm,
      muted: mutedToggleElm,
      pan: panSliderElm,
    });

    return itemEl;
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedUIState();
  }

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateSelectedUIState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let selected = false;
      if (this.#selectedValueMode === 1) {
        selected = this.#selectedValue === value;
      } else {
        selected = this.#selectedValue?.includes(value) ?? false;
      }

      element.classList.toggle("is-selected", selected);
    });
  }
}

function getTrackNames() {
  return [
    {
      value: "voice",
      text: "人声",
      description: "以说话内容为主，例如问候、主持、故事、新闻或访谈。",
    },
    {
      value: "music",
      text: "音乐",
      description: "完整或独立播放的音乐内容，例如歌曲、纯音乐或配乐。",
    },
    {
      value: "bed",
      text: "背景垫乐",
      description: "用于人声下方持续铺垫的轻音乐，通常不会单独作为正文播放。",
    },
    {
      value: "ambience",
      text: "环境声",
      description: "营造场景氛围的自然或空间声音，例如雨声、海浪、咖啡馆声。",
    },
    {
      value: "effect",
      text: "音效",
      description: "较短的提示、转场或动作声音，例如铃声、按键声、掌声。",
    },
    {
      value: "jingle",
      text: "标识音",
      description: "用于节目、栏目或品牌识别的短音频，例如台呼、片头标识。",
    },
    {
      value: "mixed",
      text: "混合成品",
      description: "已经混合完成的音频，可能同时包含人声、音乐和音效。",
    },
  ];
}
