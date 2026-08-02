function get(url) {
  return request(url, {
    method: "GET",
  });
}

function post(url, data) {
  return request(url, {
    method: "POST",
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    const message = error?.message ?? String(error);

    throw new Error(`Request failed: ${message}`, {
      cause: error,
    });
  }

  const result = await readJson(response);

  if (!response.ok) {
    throw new Error(result?.error ?? `Request failed: ${response.status}`);
  }

  return result;
}

async function readJson(response) {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  return JSON.parse(text);
}

const http = {
  get,
  post,
};

export default http;
