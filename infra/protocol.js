import { ERROR_CODE, isClientError } from "./error.js";
import { log } from "./log.js";

const PROTOCOL_ERROR_DEFAULTS = {
  includeStack: false,
};

function normalizeProtocolError(error, options = {}) {
  const errorPayloadConfig = {
    ...PROTOCOL_ERROR_DEFAULTS,
    ...options,
  };

  const { includeStack } = errorPayloadConfig;

  if (isClientError(error)) {
    return {
      code: error.code || ERROR_CODE.INTERNAL,
      message: error.message || "unknown error",
      details: error.details ?? null,
      ...(includeStack && { stack: error.stack }),
    };
  }

  if (error instanceof Error) {
    return {
      code: ERROR_CODE.INTERNAL,
      message: error.message || "unknown error",
      details: null,
      ...(includeStack && { stack: error.stack }),
    };
  }

  if (error && typeof error === "object") {
    return {
      code: error.code ?? ERROR_CODE.INTERNAL,
      message: error.message ?? "unknown error",
      details: error.details ?? null,
    };
  }

  return {
    code: ERROR_CODE.INTERNAL,
    message: typeof error === "string" ? error : "unknown error",
    details: null,
  };
}

function writeProtocolJson(payload) {
  const seen = new WeakSet();

  const json = JSON.stringify(payload, (_, v) => {
    if (typeof v === "bigint") return String(v);

    if (isClientError(v) || v instanceof Error) {
      return normalizeProtocolError(v);
    }

    if (typeof v === "object" && v !== null) {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
    }

    return v;
  });

  process.stdout.write(`${json}\n`);
}

/**
 * 构造成功结果
 */
function ok(value = null, meta) {
  return meta === undefined ? { ok: true, value } : { ok: true, value, meta };
}

/**
 * 构造失败结果（自动标准化 error）
 */
function fail(error = null, meta) {
  const err = normalizeProtocolError(error ?? "unknown error");

  return meta === undefined
    ? { ok: false, error: err }
    : { ok: false, error: err, meta };
}

/**
 * CLI 入口执行器：
 * - 执行 main
 * - 统一输出结果
 * - 捕获未处理异常并转为 fail
 */
export async function run(main, runOptions = {}) {
  try {
    const result = await main();

    if (runOptions.json) {
      writeProtocolJson(ok(result));
    }

    process.exitCode = 0;
  } catch (error) {
    log.error(error?.message ?? String(error), runOptions);

    const result = error;

    if (runOptions.json) {
      writeProtocolJson(fail(result));
    }

    process.exitCode = 1;
  } finally {
    await runOptions.cleanup?.();
  }
}
