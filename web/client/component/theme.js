const THEME_KEY = "theme";

export class Theme {
  #mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  #isSystemThemeListening = false;

  get mode() {
    return localStorage.getItem(THEME_KEY) ?? "auto";
  }

  get systemTheme() {
    return this.#mediaQuery.matches ? "dark" : "light";
  }

  get currentTheme() {
    return document.documentElement.dataset.theme ?? null;
  }

  load() {
    this.#updateSystemThemeListener();

    return this.apply();
  }

  setMode(mode) {
    if (!["light", "dark", "auto"].includes(mode)) {
      throw new Error(`invalid theme mode: ${mode}`);
    }

    localStorage.setItem(THEME_KEY, mode);

    this.#updateSystemThemeListener();

    return this.apply();
  }

  apply() {
    const theme = this.mode === "auto" ? this.systemTheme : this.mode;

    document.documentElement.dataset.theme = theme;

    return theme;
  }

  #systemThemeChange = () => {
    if (this.mode === "auto") {
      this.apply();
    }
  };

  #updateSystemThemeListener() {
    const shouldListen = this.mode === "auto";

    if (shouldListen && !this.#isSystemThemeListening) {
      this.#mediaQuery.addEventListener("change", this.#systemThemeChange);
      this.#isSystemThemeListening = true;
      return;
    }

    if (!shouldListen && this.#isSystemThemeListening) {
      this.#mediaQuery.removeEventListener("change", this.#systemThemeChange);
      this.#isSystemThemeListening = false;
    }
  }
}

export const theme = new Theme();