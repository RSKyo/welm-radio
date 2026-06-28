import { evaluate, poll } from "./runtime.js";

/**
 * ----------------------------------------------------------------------------
 * Base Utils
 * ----------------------------------------------------------------------------
 */

function q(value) {
  return JSON.stringify(value);
}

function buildElementResolver(selector, options = {}) {
  return `
    (() => {
      const elements = document.querySelectorAll(${q(selector)});
      const count = elements.length;

      if (count === 0) {
        throw new Error("element not found");
      }

      let index = ${options.nth ?? 0};

      if (index < 0) {
        index = count + index;
      }

      if (index < 0 || index >= count) {
        throw new Error(\`element index out of range: \${index}\`);
      }

      return elements[index];
    })()
  `;
}

function buildElementResolverSafe(selector, options = {}) {
  return `
    (() => {
      const elements = document.querySelectorAll(${q(selector)});
      const count = elements.length;

      if (count === 0) {
        return null;
      }

      let index = ${options.nth ?? 0};

      if (index < 0) {
        index = count + index;
      }

      if (index < 0 || index >= count) {
        return null;
      }

      return elements[index];
    })()
  `;
}

/**
 * ----------------------------------------------------------------------------
 * Element Actions
 * ----------------------------------------------------------------------------
 */

export async function focus(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolver(selector, options)};
      el.focus();
      return true;
    })()
  `;

  await evaluate(targetId, expression, options);

  return true;
}

export async function scrollIntoView(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolver(selector, options)};

      el.scrollIntoView({
        block: ${q(options.block ?? "center")},
        inline: ${q(options.inline ?? "center")},
        behavior: ${q(options.behavior ?? "instant")},
      });

      return true;
    })()
  `;

  await evaluate(targetId, expression, options);

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Element Queries
 * ----------------------------------------------------------------------------
 */

export async function hasElement(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolverSafe(selector, options)};

      return el !== null;
    })()
  `;

  return evaluate(targetId, expression, options);
}

export async function getElementsCount(targetId, selector, options = {}) {
  const expression = `
    (() => {
      return document.querySelectorAll(${q(selector)}).length;
    })()
  `;

  return evaluate(targetId, expression, options);
}

export async function getElementAttribute(
  targetId,
  selector,
  name,
  options = {},
) {
  const expression = `
    (() => {
      const el = ${buildElementResolver(selector, options)};

      if (!el.hasAttribute(${q(name)})) {
        throw new Error("attribute not found");
      }

      return el.getAttribute(${q(name)});
    })()
  `;

  return evaluate(targetId, expression, options);
}

export async function getElementAttributes(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolver(selector, options)};
      
      const out = {};
      for (const attr of el.attributes) {
        out[attr.name] = attr.value;
      }
      return out;
    })()
  `;

  return evaluate(targetId, expression, options);
}

export async function getElementInnerText(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolver(selector, options)};

      return el.innerText;
    })()
  `;

  return evaluate(targetId, expression, options);
}

export async function getElementInnerHTML(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolver(selector, options)};
      
      return el.innerHTML;
    })()
  `;

  return evaluate(targetId, expression, options);
}

export async function getElementOuterHTML(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolver(selector, options)};

      return el.outerHTML;
    })()
  `;

  return evaluate(targetId, expression, options);
}

/**
 * 获取元素位置。
 * getBoundingClientRect 返回的坐标是相对于视口（viewport）的坐标，而不是相对于页面的坐标
 */
export async function getElementBox(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolver(selector, options)};

      const rect = el.getBoundingClientRect();

      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      };
    })()
  `;

  return evaluate(targetId, expression, options);
}

export async function getElementCenter(targetId, selector, options = {}) {
  const { centerX, centerY } = await getElementBox(targetId, selector, options);

  return {
    x: centerX,
    y: centerY,
  };
}

/**
 * ----------------------------------------------------------------------------
 * Element Wait
 * ----------------------------------------------------------------------------
 */

/**
 * 等待 selector。
 */
export function waitElement(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolverSafe(selector, options)};
      return !!el;
    })()
  `;

  return poll(targetId, expression, options);
}

/**
 * 等待 selector 出现。
 */
export function waitElementAppear(targetId, selector, options = {}) {
  return waitElement(targetId, selector, {
    ...options,

    matcher(value) {
      return value === true;
    },
  });
}

/**
 * 等待 selector 消失。
 */
export function waitElementDisappear(targetId, selector, options = {}) {
  return waitElement(targetId, selector, {
    ...options,

    matcher(value) {
      return value === false;
    },
  });
}

/**
 * 等待元素可见。
 */
export function waitVisible(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolverSafe(selector, options)};
      if (!el) return false;

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0
      );
    })()
  `;

  return poll(targetId, expression, {
    ...options,

    matcher(value) {
      return value === true;
    },
  });
}

/**
 * 等待元素可编辑。
 */
export function waitEditable(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolverSafe(selector, options)};
      if (!el) return false;

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      const visible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0;

      if (!visible) return false;

      if (el.isContentEditable) {
        return true;
      }

      if (!("value" in el)) {
        return false;
      }

      return (
        !el.disabled &&
        !el.readOnly &&
        el.getAttribute('aria-disabled') !== 'true' &&
        el.getAttribute('aria-readonly') !== 'true'
      );
    })()
  `;

  return poll(targetId, expression, {
    ...options,

    matcher(value) {
      return value === true;
    },
  });
}

/**
 * 等待元素可点击。
 */
export function waitClickable(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolverSafe(selector, options)};
      if (!el) return false;

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      const visible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0;

      const enabled =
        !el.disabled &&
        el.getAttribute('aria-disabled') !== 'true';

      return visible && enabled;
    })()
  `;

  return poll(targetId, expression, {
    ...options,

    matcher(value) {
      return value === true;
    },
  });
}

/**
 * ----------------------------------------------------------------------------
 * Text Wait
 * ----------------------------------------------------------------------------
 */

/**
 * 等待元素文本。
 */
export function waitText(targetId, selector, options = {}) {
  const expression = `
    (() => {
      const el = ${buildElementResolverSafe(selector, options)};
      if (!el) return '';

      return (el.innerText ?? el.textContent ?? '').trim();
    })()
  `;

  return poll(targetId, expression, options);
}

/**
 * 等待元素文本包含指定内容。
 */
export function waitTextIncludes(
  targetId,
  selector,
  expectedText,
  options = {},
) {
  return waitText(targetId, selector, {
    ...options,

    matcher(text) {
      return text.includes(expectedText);
    },
  });
}

/**
 * 等待元素文本完全匹配。
 */
export function waitTextEquals(targetId, selector, expectedText, options = {}) {
  return waitText(targetId, selector, {
    ...options,

    matcher(text) {
      return text === expectedText;
    },
  });
}

/**
 * 等待元素文本匹配正则表达式。
 */
export function waitTextRegex(targetId, selector, pattern, options = {}) {
  const re = new RegExp(pattern);

  return waitText(targetId, selector, {
    ...options,

    matcher(text) {
      return re.test(text);
    },
  });
}

/**
 * ----------------------------------------------------------------------------
 * Count Wait
 * ----------------------------------------------------------------------------
 */

/**
 * 等待元素数量。
 */
export function waitCount(targetId, selector, options = {}) {
  const expression = `
    (() => {
      return document.querySelectorAll(
        ${q(selector)}
      ).length;
    })()
  `;

  return poll(targetId, expression, options);
}

/**
 * 等待元素数量等于指定值。
 */
export function waitCountEquals(
  targetId,
  selector,
  expectedCount,
  options = {},
) {
  return waitCount(targetId, selector, {
    ...options,

    matcher(count) {
      return count === expectedCount;
    },
  });
}

/**
 * 等待元素数量大于指定值。
 */
export function waitCountGreater(
  targetId,
  selector,
  expectedCount,
  options = {},
) {
  return waitCount(targetId, selector, {
    ...options,

    matcher(count) {
      return count > expectedCount;
    },
  });
}

/**
 * 等待元素数量大于等于指定值。
 */
export function waitCountGreaterEquals(
  targetId,
  selector,
  expectedCount,
  options = {},
) {
  return waitCount(targetId, selector, {
    ...options,

    matcher(count) {
      return count >= expectedCount;
    },
  });
}

/**
 * 等待元素数量小于指定值。
 */
export function waitCountLess(targetId, selector, expectedCount, options = {}) {
  return waitCount(targetId, selector, {
    ...options,

    matcher(count) {
      return count < expectedCount;
    },
  });
}

/**
 * 等待元素数量小于等于指定值。
 */
export function waitCountLessEquals(
  targetId,
  selector,
  expectedCount,
  options = {},
) {
  return waitCount(targetId, selector, {
    ...options,

    matcher(count) {
      return count <= expectedCount;
    },
  });
}

/**
 * 等待元素数量不等于指定值。
 */
export function waitCountNotEquals(
  targetId,
  selector,
  expectedCount,
  options = {},
) {
  return waitCount(targetId, selector, {
    ...options,

    matcher(count) {
      return count !== expectedCount;
    },
  });
}
