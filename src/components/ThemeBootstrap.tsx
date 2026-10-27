"use client";

import { useEffect } from "react";

export default function ThemeBootstrap() {
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("studyspace-theme");
      if (saved === "dark" || saved === "light" || saved === "system") {
        document.documentElement.dataset.theme = saved;
      }
    } catch {
      document.documentElement.dataset.theme = "dark";
    }
  }, []);
  return null;
}
