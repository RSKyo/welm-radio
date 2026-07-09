const NUMBER_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;

export function webHandler(handler) {
  return async (req, res, next) => {
    try {
      const options = resolveOptions(req);

      await handler(req, res, options);
    } catch (error) {
      next(error);
    }
  };
}

function resolveOptions(req) {
  return {
    ...pickOptions(req.query),
    ...pickOptions(req.body),
  };
}

function pickOptions(input) {
  const options = {};

  if (!input || typeof input !== "object") {
    return options;
  }

  for (const [key, value] of Object.entries(input)) {
    if (!key.startsWith("__")) {
      continue;
    }

    const name = key.slice(2);

    if (!name) {
      continue;
    }

    options[name] = parseValue(value);
  }

  return options;
}

function parseValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  const text = value.trim();
  const lowerText = text.toLowerCase();

  if (NUMBER_RE.test(text)) {
    return Number(text);
  }

  if (lowerText === "true") {
    return true;
  }

  if (lowerText === "false") {
    return false;
  }

  return value;
}
