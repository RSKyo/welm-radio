export async function safeRun(fn) {
  try {
    return await fn();
  } catch (error) {
    console.log("safeRun caught:", error);

    window.alert(error?.message ?? String(error));

    return null;
  }
}

export const api = {
  get,
  post,
};

async function get(url) {
  return await request(url, {
    method: "GET",
  });
}

async function post(url, data) {
  return await request(url, {
    method: "POST",
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

async function request(url, options = {}) {
  let res;

  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
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
