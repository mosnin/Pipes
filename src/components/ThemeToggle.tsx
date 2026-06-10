"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Tooltip } from "@/components/ui";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pipes-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.setAttribute("data-color-scheme", isDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("pipes-theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-color-scheme", next ? "dark" : "light");
  }

  return (
    <Tooltip content="Theme">
      <button
        type="button"
        onClick={toggle}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-black/[0.04] hover:text-[#111] transition-colors"
      >
        {dark ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </Tooltip>
  );
}
