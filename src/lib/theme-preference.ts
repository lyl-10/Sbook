"use client";

export type ThemeMode = "system" | "light" | "dark";

export type ThemeSnapshot = {
  mode: ThemeMode;
  isDark: boolean;
  error: string;
};

const themeEventName = "sbook-theme-change";
const themeStorageKey = "sbook-theme";
const systemPreference = "(prefers-color-scheme: dark)";
const serverSnapshot: ThemeSnapshot = {
  mode: "system",
  isDark: false,
  error: "",
};

let themeSnapshot = serverSnapshot;
let systemMediaQuery: MediaQueryList | null = null;

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function publishTheme(
  mode: ThemeMode,
  error = "",
  systemPrefersDark?: boolean,
) {
  const isDark =
    mode === "dark" ||
    (mode === "system" &&
      (systemPrefersDark ?? window.matchMedia(systemPreference).matches));

  themeSnapshot = { mode, isDark, error };
  document.documentElement.classList.toggle("dark", isDark);
  window.dispatchEvent(new Event(themeEventName));
}

function subscribeToSystemPreference() {
  if (systemMediaQuery) return;

  systemMediaQuery = window.matchMedia(systemPreference);
  systemMediaQuery.addEventListener("change", (event) => {
    if (themeSnapshot.mode === "system") {
      publishTheme("system", themeSnapshot.error, event.matches);
    }
  });
}

export function subscribeTheme(listener: () => void) {
  window.addEventListener(themeEventName, listener);
  subscribeToSystemPreference();
  return () => window.removeEventListener(themeEventName, listener);
}

export function getThemeSnapshot() {
  return themeSnapshot;
}

export function getServerThemeSnapshot() {
  return serverSnapshot;
}

export function initializeTheme() {
  let mode: ThemeMode = "system";
  let error = "";

  try {
    const savedMode = window.localStorage.getItem(themeStorageKey);
    if (isThemeMode(savedMode)) mode = savedMode;
  } catch {
    error = "无法读取主题偏好，已改为跟随系统。";
  }

  subscribeToSystemPreference();
  publishTheme(mode, error);
}

export function setThemeMode(mode: ThemeMode) {
  let error = "";

  try {
    window.localStorage.setItem(themeStorageKey, mode);
  } catch {
    error = "主题已切换，但浏览器无法保存此偏好。";
  }

  subscribeToSystemPreference();
  publishTheme(mode, error);
  return error;
}
