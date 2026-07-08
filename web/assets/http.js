window.api = {
  async get(url) {
    return await request(url, {
      method: "GET",
    });
  },

  async post(url, data) {
    return await request(url, {
      method: "POST",
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  },
};

async function request(url, options = {}) {
  let res;

  try {
    res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }

  const result = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(result?.error ?? `Request failed: ${res.status}`);
  }

  return result;
}

window.runAction = async function runAction(action, options = {}) {
  try {
    return await action();
  } catch (error) {
    if (!options.silent) {
      alert(error?.message ?? String(error));
    }

    return null;
  }
};