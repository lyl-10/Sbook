"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeSnapshot = {
  isDark: boolean;
  error: string;
};

const themeEventName = "sbook-theme-change";
const serverSnapshot: ThemeSnapshot = { isDark: false, error: "" };
let themeSnapshot = serverSnapshot;

function subscribeTheme(listener: () => void) {
  window.addEventListener(themeEventName, listener);
  return () => window.removeEventListener(themeEventName, listener);
}

function getThemeSnapshot() {
  return themeSnapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function setTheme(isDark: boolean, error = "") {
  themeSnapshot = { isDark, error };
  document.documentElement.classList.toggle("dark", isDark);
  window.dispatchEvent(new Event(themeEventName));
}

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { isDark, error } = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    try {
      setTheme(window.localStorage.getItem("sbook-theme") === "dark");
    } catch {
      setTheme(false, "无法读取主题偏好，当前使用日间模式。");
    }
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    try {
      window.localStorage.setItem("sbook-theme", nextIsDark ? "dark" : "light");
      setTheme(nextIsDark);
    } catch {
      setTheme(nextIsDark, "主题已切换，但浏览器无法保存此偏好。");
    }
  };

  return (
    <div>
      <Button
        variant="ghost"
        type="button"
        aria-label={isDark ? "切换到日间模式" : "切换到夜间模式"}
        aria-pressed={isDark}
        title={isDark ? "切换到日间模式" : "切换到夜间模式"}
        onClick={toggleTheme}
        className={`mt-4 h-auto flex items-center gap-3 rounded-xl py-3 text-sm font-medium text-blue-900 hover:bg-blue-50 hover:text-blue-900 ${
          collapsed
            ? "justify-center px-2"
            : "justify-center px-2 sm:justify-start sm:px-3 lg:px-4"
        }`}
      >
        <span aria-hidden="true" className="flex shrink-0 items-center">
          {isDark ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </span>
        <span className={collapsed ? "hidden" : "hidden sm:inline"}>
          {isDark ? "日间模式" : "夜间模式"}
        </span>
        <span
          aria-hidden="true"
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            collapsed
              ? "hidden"
              : "hidden sm:inline-flex"
          } ${
            isDark ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600"
          }`}
        >
          <span
            className={`absolute left-1 top-1 size-4 rounded-full shadow-sm transition-transform ${
              isDark
                ? "translate-x-4 bg-slate-900"
                : "translate-x-0 bg-white"
            }`}
          />
        </span>
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
