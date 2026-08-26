import { ItemsElm } from "./base/items-elm.js";
import {
  isNullishOrEmpty,
  assertBoolean,
  assertNonBlankString,
  assertFunction,
  assertPositiveInteger,
  assertValueIn,
} from "./base/assert.js";

const ROOT_CLASS = "timeline-track-list";
const ITEM_TEMPLATE = `
<div class="timeline-track-list-item" data-role="item">
  timeline track list item
</div>
`;

export class TimelineTrackList extends ItemsElm {
  // templates
  #itemTemplateHTML;
  #itemTemplate;
  // state

  // event

  constructor(root, options = {}) {
    super(root, {
      ...options,
      rootClass: ROOT_CLASS,
    });

    this.#initItemTemplate(options.itemTemplate);
    this.#bindEvents();
  }
  #initItemTemplate(target) {
    if (target == null) {
      this.#itemTemplate = this.createElementByHTML(
        ITEM_TEMPLATE,
        "ITEM_TEMPLATE",
      );
      return;
    }

    const fieldName = "options.itemTemplate";
    assertNonBlankString(target, fieldName);
    const itemTemplate = this.resolveElement(target, fieldName);
    assertElementMatches(itemTemplate, '[data-role="item"]', fieldName);

    this.#itemTemplate = itemTemplate;
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {}

  // ---------------------------------------------------------------------------
  // update ui state
  // ---------------------------------------------------------------------------

  #updateSelectedState() {
    // this.eachItem(({ element, value }) => {
    //   if (!element) return;
    //   let selected = false;
    //   if (this.#selectedValueMode === 1) {
    //     selected = this.#selectedValue === value;
    //   } else if (this.#selectedValueMode === 2) {
    //     selected = this.#selectedValue?.includes(value) ?? false;
    //   }
    //   element.classList.toggle("is-selected", selected);
    // });
  }

  // ---------------------------------------------------------------------------
  // overrides
  // ---------------------------------------------------------------------------

  // override
  renderItem(item) {
    const value = item[this.valueField];
    const text = item[this.textField];
    const tooltip = item[this.tooltipField];

    const itemElement = this.#itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;

    this.dom.add(value, itemElement);
  }

  // Override
  onItemsChange(items) {}

  // override
  afterRender(items) {
    // this.#updateSelectedState();
  }
}
