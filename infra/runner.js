// -----------------------------------------------------------------------------
// runner
// -----------------------------------------------------------------------------
// CLI command runner.
//
// Public API:
// - run(main, runOptions)
//
// Responsibilities:
// - Execute main.
// - Write protocol JSON output when needed.
// - Convert thrown values to Error objects.
// - Set process.exitCode.
// - Run optional cleanup.
//
// Version: 0.1.0
// Last updated: 2026-07-04
// -----------------------------------------------------------------------------

import { log } from "./log.js";

// #region public API

// CLI 入口执行器
export async function run(main, runOptions = {}) {
  try {
    const result = await main();

    const okPayload = ok(result);
    writeProtocolPayload(okPayload, runOptions);

    process.exitCode = 0;
  } catch (error) {
    const caughtError = toError(error);
    log.error(caughtError.message, runOptions);

    const failPayload = fail(caughtError);
    writeProtocolPayload(failPayload, runOptions);

    process.exitCode = 1;
  } finally {
    await runOptions.cleanup?.();
  }
}

// #endregion

// #region private helpers

function ok(value = null) {
  return { ok: true, value };
}

function fail(error = null) {
  return { ok: false, error };
}

function toError(error) {
  if (error instanceof Error) {
    return error;
  }

  if (error == null) {
    return new Error("unknown error");
  }

  if (
    typeof error === "object" &&
    typeof error.message === "string" &&
    error.message
  ) {
    return new Error(error.message);
  }

  try {
    return new Error(String(error) || "unknown error");
  } catch {
    return new Error("unknown error");
  }
}

function protocolJson(payload, runOptions = {}) {
  const seen = new WeakSet();

  return JSON.stringify(payload, (_, v) => {
    // 处理 bigint
    if (typeof v === "bigint") {
      return String(v);
    }

    // 处理 Error
    if (v instanceof Error) {
      const result = {
        message: v.message || "unknown error",
      };

      if (runOptions.stack === true && v.stack) {
        result.stack = v.stack;
      }

      return result;
    }

    // 处理循环引用
    if (typeof v === "object" && v !== null) {
      if (seen.has(v)) {
        return "[Circular]";
      }

      seen.add(v);
    }

    return v;
  });
}

function writeLine(text) {
  process.stdout.write(`${text}\n`);
}

function writeProtocolPayload(payload, runOptions = {}) {
  if (!runOptions.json) return;

  const json = protocolJson(payload, runOptions);
  writeLine(json);
}

// #endregion