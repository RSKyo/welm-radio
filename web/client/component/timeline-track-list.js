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
const DEFAULT_ITEM_TEMPLATE_HTML = `
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
     this.#initTemplates(options);
    this.#bindEvents();
  }

  #initTemplates(options = {}) {
    this.#initItemTemplate(options);
  }

  #initItemTemplate(options) {
    if (options.itemTemplateHTML != null) {
      assertNonBlankString(
        options.itemTemplateHTML,
        "options.itemTemplateHTML",
      );

      if (this.#itemTemplateHTML === options.itemTemplateHTML) {
        return;
      }

      const itemTemplateHTML = options.itemTemplateHTML;
      const itemTemplate = this.createElementByHTML(itemTemplateHTML);
      this.#validateItemTemplate(itemTemplate);

      this.#itemTemplateHTML = itemTemplateHTML;
      this.#itemTemplate = itemTemplate;
      return;
    }

    if (this.#itemTemplate == null) {
      const itemTemplate = this.createElementByHTML(DEFAULT_ITEM_TEMPLATE_HTML);
      this.#itemTemplateHTML = DEFAULT_ITEM_TEMPLATE_HTML;
      this.#itemTemplate = itemTemplate;
    }
  }

   #validateItemTemplate(element) {
    assertElementMatches(element, '[data-role="item"]', "item element");
  }

  // -----------------------------------------------------------------------------
  // bind events
  // -----------------------------------------------------------------------------

  #bindEvents() {
    if (this.rootElement == null) {
      return;
    }

  }


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
  createItemElement(item) {
    const value = item[this.valueField];
    const text = item[this.textField];
    const tooltip = item[this.tooltipField];

    const itemElement = this.#itemTemplate.cloneNode(true);
    itemElement.dataset.value = value;
    

    return itemElement;
  }

  // Override
  onItemsChange(items) {
    
  }

  // override
  afterRender(items) {
    // this.#updateSelectedState();
  }
}
