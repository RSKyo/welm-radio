export class Http {
  #prefix;

  constructor(prefix = "") {
    if (typeof prefix !== "string") {
      throw new TypeError("prefix must be a string");
    }

    if (prefix !== "" && !prefix.startsWith("/")) {
      throw new Error("prefix must start with '/'");
    }

    this.#prefix = prefix;
  }

  get(url) {
    return this.#request(this.#joinUrl(url), {
      method: "GET",
    });
  }

  post(url, data) {
    return this.#request(this.#joinUrl(url), {
      method: "POST",
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  async #request(url, options = {}) {
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

    if (response.status === 204) {
      return undefined;
    }

    const text = await response.text();

    if (!text) {
      return undefined;
    }

    const result = JSON.parse(text);

    if (!response.ok) {
      throw new Error(result?.error ?? `Request failed: ${response.status}`);
    }

    return result;
  }

  #joinUrl(url) {
    if (!url.startsWith("/")) {
      return `${this.#prefix}/${url}`;
    }

    return `${this.#prefix}${url}`;
  }
}
