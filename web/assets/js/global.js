import { Toast } from "/assets/component/toast.js";

export const toast = new Toast();

export async function safeRun(action) {
  try {
    return await action();
  } catch (error) {
    console.error(error);

    toast.error(error?.message ?? String(error));

    return undefined;
  }
}

export const api = {
  get,
  post,
};

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

  if (response.status === 204) {
    return undefined;
  }
  
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.error ?? `Request failed: ${response.status}`,
    );
  }

  return result;
}