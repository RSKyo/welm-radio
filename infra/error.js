export const ERROR_CODE = {
  // 参数/输入
  REQUIRED: "REQUIRED",
  INVALID: "INVALID",

  // 目标/资源
  NOT_FOUND: "NOT_FOUND",

  // 执行/运行
  EVALUATE_ERROR: "EVALUATE_ERROR",
  TIMEOUT: "TIMEOUT",

  // 系统
  INTERNAL: "INTERNAL",
};

class ClientError extends Error {
  constructor(code, message, details = null) {
    super(message);
    // 在 JS 里，继承普通类通常没事，但继承一些内建对象时，尤其是 Error，有时实例的原型链不会完全按你预期工作。
    // err instanceof ClientError 可能判断不稳定
    // 把当前实例 this 的原型，设成 ClientError 的 prototype
    // new.target 被哪个构造函数 new 出来的，new ClientError(...) 就是 ClientError
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "ClientError";
    this.code = code || ERROR_CODE.INTERNAL;
    this.details = details;
  }
}

export const isClientError = (error) => error instanceof ClientError;

function interpolate(message, ...values) {
  if (!message) return "";

  // 对象模式
  if (Object.prototype.toString.call(values[0]) === "[object Object]") {
    const params = values[0];

    return message.replace(/\{([^}]+)\}/g, (_, key) => {
      return params[key] ?? "";
    });
  }

  // 顺序模式
  let index = 0;

  return message.replace(/\{[^}]+\}/g, () => {
    return values[index++] ?? "";
  });
}

export function createError(code, message = null, details = null, ...values) {
  code ??= ERROR_CODE.INTERNAL;
  message ??= "unknown error";
  message = interpolate(message, ...values);

  return new ClientError(code, message, details);
}
