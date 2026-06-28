import { getClient } from "./client.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 在页面上下文中执行 JavaScript 表达式。
 *
 * targetId:
 *   CDP Target ID
 *
 * expression:
 *   JavaScript 表达式
 *
 * options:
 *   host  CDP Host
 *   port  CDP Port
 *
 * 返回：
 *   expression 的执行结果
 */
export async function evaluate(targetId, expression, options = {}) {
  const { Runtime } = await getClient(targetId, options);

  const { result, exceptionDetails } = await Runtime.evaluate({
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (exceptionDetails) {
    const message =
      exceptionDetails.exception?.description ||
      exceptionDetails.text ||
      "expression threw an exception";

    throw new Error(message);
  }

  if (!result) {
    throw new Error("missing evaluation result");
  }

  if (result.type === "undefined") {
    return undefined;
  }

  if ("value" in result) {
    return result.value;
  }

  return result.description;
}

/**
 * 判断轮询结果是否命中。
 *
 * 命中规则：
 *   null       -> false
 *   undefined  -> false
 *   false      -> false
 *   ""         -> false
 *   0          -> false
 *   其它值     -> true
 */
function defaultMatcher(value) {
  if (value == null) return false;

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  return true;
}

/**
 * 轮询执行 expression，
 * 直到返回值满足 matcher 条件。
 *
 * matcher 连续命中 matchTimes 次后返回结果。
 *
 * 默认 matcher：
 * - null / undefined -> false
 * - false -> false
 * - 0 -> false
 * - 空字符串 -> false
 * - 其它值 -> true
 *
 * 默认 matchTimes 为 1。
 */
export async function poll(targetId, expression, options = {}) {
  const timeout = options.timeout ?? 30000;
  const interval = options.interval ?? 500;
  const matcher = options.matcher ?? defaultMatcher;
  const matchTimes = options.matchTimes ?? 1;

  const start = Date.now();

  let value;
  let times = 0;
  let matchedTimes = 0;

  while (Date.now() - start < timeout) {
    value = await evaluate(targetId, expression, options);
    times++;

    if (matcher(value)) {
      matchedTimes++;

      if (matchedTimes >= matchTimes) {
        return {
          value,
          times,
          matchedTimes,
        };
      }
    } else {
      matchedTimes = 0;
    }

    const remaining = timeout - (Date.now() - start);
    if (remaining <= 0) break;

    await sleep(Math.min(interval, remaining));
  }

  throw new Error(
    `poll condition not matched: timeout=${timeout}ms, interval=${interval}ms, elapsed=${Date.now() - start}ms`,
  );
}
