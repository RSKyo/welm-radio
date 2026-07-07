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
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }

  return data;
}