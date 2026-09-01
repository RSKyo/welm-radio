import { ItemsElm } from "./base/items-elm.js";
import { TimelineComboBox } from "./timeline-combo-box.js";
import { Slider } from "./slider.js";
import {
  isNullishOrEmpty,
  assertBoolean,
  assertNonBlankString,
  assertFunction,
  assertPositiveInteger,
  assertValueIn,
  assertElementMatches,
} from "./base/assert.js";

const ROOT_CLASS = "timeline-track-header-list";
const TRACK_HEADER_TEMPLATE = `
<div class="timeline-track-header">
  <div data-role="timeline-track-header-name"></div>
  <div data-role="timeline-track-header-gain"></div>
</div>
`;

export class TimelineTrackHeaderList extends ItemsElm {
  // state
  #nameElms = [];
  #gainElms = [];
  #selectedValue;
  #selectedValueMode = 1;
  // ruler
  #timelineRuler;
  // event
  #onSelectedChange;

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });

    this.#initOptions(options);
    this.#bindEvents();
  }

  // -----------------------------------------------------------------------------
  // options
  // -----------------------------------------------------------------------------

  #initOptions(options) {}

  // -----------------------------------------------------------------------------
  // selected value
  // -----------------------------------------------------------------------------

  getSelectedValue() {
    if (isNullishOrEmpty(this.#selectedValue)) {
      return null;
    }
    return this.#selectedValueMode === 2
      ? [...this.#selectedValue]
      : this.#selectedValue;
  }

  setSelectedValue(value) {
    this.validateValueByMode(value, this.#selectedValueMode);

    const oldValue = this.#selectedValue;
    if (isNullishOrEmpty(value)) {
      this.#selectedValue = null;
    } else {
      this.validateValueExists(value);
      this.#selectedValue = this.#selectedValueMode === 2 ? [...value] : value;
    }

    const newValue = this.#selectedValue;
    if (!this.isEqualValue(newValue, oldValue)) {
      this.#updateSelectedState();

      this.#onSelectedChange?.({
        value: this.getSelectedValue(),
        item: this.getItem(newValue),
      });
    }
  }

  // -----------------------------------------------------------------------------
  // events
  // -----------------------------------------------------------------------------

  set onSelectedChange(handler) {
    if (handler != null) {
      assertFunction(handler, "handler");
      this.#onSelectedChange = handler;
      return;
    }

    // handler can be null to remove the event listener
    this.#onSelectedChange = null;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    this.dom.onRoot("click", this.#handleRootClick);
  }

  #handleRootClick = (event, { targetClosest }) => {
    targetClosest('[data-role="timeline-track-header"]', ({ target }) => {
      const value = target.dataset.value;

      if (this.#selectedValueMode === 1) {
        this.setSelectedValue(value);
        return;
      }

      const oldValue = this.#selectedValue ?? [];
      const newValue = oldValue.includes(value)
        ? oldValue.filter((v) => v !== value)
        : [...oldValue, value];

      this.setSelectedValue(newValue);
    });
  };

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateSelectedState() {
    this.eachItem(({ element, value }) => {
      if (!element) return;

      let selected = false;
      if (this.#selectedValueMode === 1) {
        selected = this.#selectedValue === value;
      } else if (this.#selectedValueMode === 2) {
        selected = this.#selectedValue?.includes(value) ?? false;
      }

      element.classList.toggle("is-selected", selected);
    });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  renderItem(item) {
    const value = item[this.valueField];
    const text = item[this.textField];
    const tooltip = item[this.tooltipField];

    const trackHeaderEl = this.createElementByHTML(
      TRACK_HEADER_TEMPLATE,
      "TRACK_HEADER_TEMPLATE",
    );

    const nameEl = trackHeaderEl.querySelector(
      '[data-role="timeline-track-header-name"]',
    );
    const gainEl = trackHeaderEl.querySelector(
      '[data-role="timeline-track-header-gain"]',
    );

    const nameComboBox = new TimelineComboBox(nameEl);
    nameComboBox.items = getTrackNames();
    this.#nameElms.push(nameComboBox);

    const gainSlider = new Slider(gainEl, {
      base: 100,
      min: 0,
      max: 200,
      step: 1,
      value: 100,
      suffix: "%",
      showPercent: true,
      showValue: false,
    });
    this.#gainElms.push(gainSlider);

    this.dom.add(value, trackHeaderEl);
  }

  // Override
  onItemsChange(items) {}

  // override
  afterRender(items) {
    // this.#updateSelectedState();
  }
}

function getTrackNames() {
  return ["主持人", "嘉宾", "背景音乐", "环境音", "音效", "标识音"];
}
