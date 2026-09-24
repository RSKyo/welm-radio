import {
  assertNonNegative,
  assertPositive,
  assertValueIn,
} from "../base/assert.js";
import {
  createElementByHTML,
  normalizeValue,
  assertValueForMode,
  isEqualValue,
  filterValue,
  getBySelector,
} from "../base/elm-helper.js";
import { ItemsElm } from "../base/items-elm.js";
import { ClipGroup } from "./clip-group.js";
import { TimelineRuler } from "./ruler.js";

const ITEM_TEMPLATE = `
<div class="track" data-role="item">
  <div data-role="clip-group">
  </div>
</div>
`;

const itemTemplate = createElementByHTML(ITEM_TEMPLATE);

export class TrackList extends ItemsElm {
  // state
  #selectedValue = null;
  #selectedValueMode = 1;

  // ruler
  #timeRuler = null;

  // #pixelsPerSecond = 0;
  //  #duration = 0;
  // #width = 0;
  // ClipGroup component map
  #itemClipGroupMap = new Map();

  constructor(root, options = {}) {
    super(root, {
      ...options,
      defaultRootClass: "track-list",
    });

    this.#init();
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // initialization
  // -----------------------------------------------------------------------------

  #init() {
    this.resolveOption(
      "timelineRuler",
      (value, assertionSubject) => {
        if (value instanceof TimelineRuler) {
          this.#timeRuler = value;
        } else {
          throw new Error("must provide a valid TimelineRuler instance");
        }
      },
      () => {
        throw new Error("must provide a valid TimelineRuler instance");
      },
    );

    this.resolveOption("height", (value, assertionSubject) => {
      assertPositive(value, assertionSubject);
      this.rootElement.style.setProperty("--track-height", `${value}px`);
    });
  }

  // -----------------------------------------------------------------------------
  // state(read-only)
  // -----------------------------------------------------------------------------

  

  // -----------------------------------------------------------------------------
  // state(read-write)
  // -----------------------------------------------------------------------------

  get selectedValue() {
    return normalizeValue(this.#selectedValue, this.#selectedValueMode);
  }

  set selectedValue(value) {
    assertValueForMode(value, this.#selectedValueMode);
    const oldValue = this.#selectedValue;
    const newValue = normalizeValue(value, this.#selectedValueMode);

    if (isEqualValue(newValue, oldValue)) {
      return;
    }

    this.#selectedValue = newValue;

    this.#updateSelectedUIState();
    this.#emitSelectedChange(newValue);
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
      selector: '[data-role="item"]',
    });

    this.#timeRuler.onPixelsPerSecondChange = ({ pixelsPerSecond }) => {
      for (const clipGroupElm of this.#itemClipGroupMap.values()) {
        clipGroupElm.pixelsPerSecond = pixelsPerSecond;
      }
    };

    this.#timeRuler.onWidthChange = ({ width }) => {
      console.log(3,this.#timeRuler.duration,this.#timeRuler.width);
      this.#updateWidthUIState();
    };
  }

  #itemClickHandler = (event, { element }) => {
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

  #updateWidthUIState() {
    this.eachItem(({ element }) => {
      if (!element) return;
      element.style.width = `${this.#timeRuler.width}px`;
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  afterSetItems(items) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);

    for (const clipGroupElm of this.#itemClipGroupMap.values()) {
      clipGroupElm.destroy();
    }

    this.#itemClipGroupMap.clear();
  }

  // override
  afterRemoveItem(removedItem) {
    const itemValues = this.itemValues;
    this.#selectedValue = filterValue(this.#selectedValue, itemValues);

    const value = removedItem[this.valueField];
    const clipGroupElm = this.#itemClipGroupMap.get(value);

    clipGroupElm?.destroy();
    this.#itemClipGroupMap.delete(value);
  }

  // override
  createItemElement(item) {
    const value = item[this.valueField];

    const itemEl = itemTemplate.cloneNode(true);
    itemEl.dataset.value = value;
    itemEl.style.width = `${this.#timeRuler.width}px`;

    const clipGroupEl = getBySelector(itemEl, '[data-role="clip-group"]');

    const clipGroupElm = new ClipGroup(clipGroupEl, {
      valueField: "clipId",
      pixelsPerSecond: this.#timeRuler.pixelsPerSecond,
    });

    this.#itemClipGroupMap.set(value, clipGroupElm);

    return itemEl;
  }

  // override
  afterRenderItems(items) {
    this.#updateSelectedUIState();
  }
  // ---------------------------------------------------------------------------
  // add clip to track
  // ---------------------------------------------------------------------------

  addClip(trackValue, clip) {
    console.log(1,this.#timeRuler.duration,this.#timeRuler.width);
    const clipGroupElm = this.#itemClipGroupMap.get(trackValue);

    if (!clipGroupElm) {
      throw new Error(`track not found: ${trackValue}`);
    }

    clipGroupElm.addItem(clip);

    const maxClipGroupEnd = this.#getMaxClipGroupEnd();
    this.#timeRuler.duration = maxClipGroupEnd;
    console.log(2,this.#timeRuler.duration,this.#timeRuler.width);
  }

  #getMaxClipGroupEnd() {
    let maxClipGroupEnd = 0;

    for (const clipGroupElm of this.#itemClipGroupMap.values()) {
      maxClipGroupEnd = Math.max(maxClipGroupEnd, clipGroupElm.clipGroupEnd);
    }

    return maxClipGroupEnd;
  }
}
