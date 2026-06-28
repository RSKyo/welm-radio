import { getClient } from "./client.js";
import { scrollIntoView, getElementBox, waitClickable } from "./dom.js";

/**
 * ----------------------------------------------------------------------------
 * Base Utils
 * ----------------------------------------------------------------------------
 */

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ----------------------------------------------------------------------------
 * Mouse State
 * ----------------------------------------------------------------------------
 */

const mouseState = {
  x: 0,
  y: 0,
  lastUpdate: 0,
};

/**
 * ----------------------------------------------------------------------------
 * Mouse Primitives (CDP)
 * ----------------------------------------------------------------------------
 */

async function mouseMoveTo(targetId, x, y, options = {}) {
  const { Input } = await getClient(targetId, options);

  await Input.dispatchMouseEvent({
    type: "mouseMoved",
    x: Number(x),
    y: Number(y),
    buttons: options.buttons ?? 0,
    modifiers: options.modifiers ?? 0,
  });

  mouseState.x = x;
  mouseState.y = y;
  mouseState.lastUpdate = Date.now();

  return true;
}

async function mouseDownAt(targetId, x, y, options = {}) {
  const { Input } = await getClient(targetId, options);

  await Input.dispatchMouseEvent({
    type: "mousePressed",
    x: Number(x),
    y: Number(y),
    button: options.button ?? "left",
    buttons: options.buttons ?? 1,
    modifiers: options.modifiers ?? 0,
    clickCount: options.clickCount ?? 1,
  });

  return true;
}

async function mouseUpAt(targetId, x, y, options = {}) {
  const { Input } = await getClient(targetId, options);

  await Input.dispatchMouseEvent({
    type: "mouseReleased",
    x: Number(x),
    y: Number(y),
    button: options.button ?? "left",
    buttons: options.buttons ?? 0,
    modifiers: options.modifiers ?? 0,
    clickCount: options.clickCount ?? 1,
  });

  return true;
}

/**
 * 在指定 viewport 坐标触发鼠标滚轮。
 *
 * x、y 基于 viewport 坐标。
 * deltaY > 0 向下滚动，deltaY < 0 向上滚动。
 */
async function wheelAt(targetId, x, y, deltaX = 0, deltaY = 0, options = {}) {
  const { Input } = await getClient(targetId, options);

  await Input.dispatchMouseEvent({
    type: "mouseWheel",
    x: Number(x),
    y: Number(y),
    deltaX: Number(deltaX),
    deltaY: Number(deltaY),
    modifiers: options.modifiers ?? 0,
  });

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Human Mouse Helpers
 * ----------------------------------------------------------------------------
 */

function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function getMouseMoveNextPoint(p1, p2) {
  const scale = 0.5;
  const t = 0.8;

  const d = distance(p1, p2);
  const p1r = d * scale;
  const p2r = d * t;

  while (true) {
    const angle = Math.random() * Math.PI * 2;
    const p3r = Math.sqrt(Math.random()) * p1r;

    const p3 = {
      x: p1.x + Math.cos(angle) * p3r,
      y: p1.y + Math.sin(angle) * p3r,
    };

    if (distance(p3, p2) <= p2r) {
      return p3;
    }
  }
}

function getMouseMovePoints(p1, p2) {
  const threshold = 10;

  const points = [p1];
  let p3 = p1;

  while (distance(p3, p2) > threshold) {
    p3 = getMouseMoveNextPoint(p3, p2);
    points.push(p3);
  }

  points.push(p2);

  return points;
}

function getMouseMoveIntervals(totalTime, stepCount) {
  const result = [];

  for (let i = 0; i < stepCount; i++) {
    const t = stepCount === 1 ? 1 : i / (stepCount - 1);

    // cosine ease-in-out（更自然）
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);

    result.push(eased);
  }

  const sum = result.reduce((a, b) => a + b, 0);

  return result.map((v) => (v / sum) * totalTime);
}

function getJitterPoint(x, y) {
  const hasJitter = Math.random() < 0.2;

  return {
    x: x + (hasJitter ? random(-2, 2) : 0),
    y: y + (hasJitter ? random(-2, 2) : 0),
  };
}

function gaussian() {
  return (
    (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2
  );
}

function getElementInteractionPoint(box) {
  const jitterRadius = Math.min(10, Math.min(box.width, box.height) * 0.2);

  const x = box.centerX + gaussian() * jitterRadius;
  const y = box.centerY + gaussian() * jitterRadius;

  return { x, y, box };
}

/**
 * ----------------------------------------------------------------------------
 * Human Mouse Actions
 * ----------------------------------------------------------------------------
 */

async function mouseMove(targetId, x, y, options = {}) {
  const p1 = {
    x: mouseState.x,
    y: mouseState.y,
  };
  const p2 = { x, y };

  const points = getMouseMovePoints(p1, p2);
  const count = points.length;
  const totalTime = random(500, 1000);
  const delays = getMouseMoveIntervals(totalTime, count - 1);

  for (let i = 0; i < count; i++) {
    const p = points[i];
    await mouseMoveTo(targetId, p.x, p.y, options);

    if (i < count - 1) {
      await sleep(delays[i]);
    }
  }

  return true;
}

async function clickAt(targetId, x, y, options = {}) {
  // move 到目标点（带轨迹系统）
  await mouseMove(targetId, x, y, options);
  await sleep(random(80, 220));

  let p = getJitterPoint(x, y);

  await mouseDownAt(targetId, p.x, p.y, options);
  await sleep(random(30, 120));
  await mouseUpAt(targetId, p.x, p.y, options);
  await sleep(random(50, 180));

  return true;
}

async function doubleClickAt(targetId, x, y, options = {}) {
  // move 到目标点（带轨迹系统）
  await mouseMove(targetId, x, y, options);
  await sleep(random(80, 220));

  const p1 = getJitterPoint(x, y);

  await mouseDownAt(targetId, p1.x, p1.y, {
    ...options,
    buttons: 1,
    clickCount: 1,
  });
  await sleep(random(30, 120));
  await mouseUpAt(targetId, p1.x, p1.y, {
    ...options,
    buttons: 0,
    clickCount: 1,
  });

  await sleep(random(80, 180));

  const p2 = getJitterPoint(x, y);

  await mouseDownAt(targetId, p2.x, p2.y, {
    ...options,
    buttons: 1,
    clickCount: 2,
  });
  await sleep(random(30, 120));
  await mouseUpAt(targetId, p2.x, p2.y, {
    ...options,
    buttons: 0,
    clickCount: 2,
  });

  return true;
}

export async function click(targetId, selector, options = {}) {
  await scrollIntoView(targetId, selector, options);
  await waitClickable(targetId, selector, options);

  const box = await getElementBox(targetId, selector, options);
  const { x, y } = getElementInteractionPoint(box);

  return clickAt(targetId, x, y, options);
}

export async function doubleClick(targetId, selector, options = {}) {
  await scrollIntoView(targetId, selector, options);
  await waitClickable(targetId, selector, options);

  const box = await getElementBox(targetId, selector, options);
  const { x, y } = getElementInteractionPoint(box);

  return doubleClickAt(targetId, x, y, options);
}
