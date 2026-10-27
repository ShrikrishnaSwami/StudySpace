"use client";

import { useEffect } from "react";

export default function ThemeBootstrap() {
  useEffect(() => {
    const apply = () => {
      try {
        const saved = window.localStorage.getItem("studyspace-theme");
        const theme = saved === "dark" || saved === "light" || saved === "system" ? saved : "dark";
        const resolved = theme === "system"
          ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
          : theme;
        document.documentElement.dataset.theme = resolved;
      } catch {
        document.documentElement.dataset.theme = "dark";
      }
    };
    apply();
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);
  return null;
}
