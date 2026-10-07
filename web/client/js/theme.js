const THEME_KEY = "theme";

const themeMediaQuery = window.matchMedia(
  "(prefers-color-scheme: dark)",
);

let isSystemThemeListening = false;

export function getThemeMode() {
  return localStorage.getItem(THEME_KEY) ?? "auto";
}

export function getSystemTheme() {
  return themeMediaQuery.matches ? "dark" : "light";
}

export function applyTheme() {
  const mode = getThemeMode();

  const theme =
    mode === "auto"
      ? getSystemTheme()
      : mode;

  document.documentElement.dataset.theme = theme;

  return theme;
}

export function setThemeMode(mode) {
  if (mode !== "light" && mode !== "dark" && mode !== "auto") {
    throw new Error(`invalid theme mode: ${mode}`);
  }

  localStorage.setItem(THEME_KEY, mode);

  updateSystemThemeListener();

  return applyTheme();
}

export function loadTheme() {
  updateSystemThemeListener();

  return applyTheme();
}

function systemThemeChange() {
  if (getThemeMode() === "auto") {
    applyTheme();
  }
}

function updateSystemThemeListener() {
  const shouldListen = getThemeMode() === "auto";

  if (shouldListen && !isSystemThemeListening) {
    themeMediaQuery.addEventListener("change", systemThemeChange);
    isSystemThemeListening = true;
    return;
  }

  if (!shouldListen && isSystemThemeListening) {
    themeMediaQuery.removeEventListener("change", systemThemeChange);
    isSystemThemeListening = false;
  }
}