"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// The initial class is set by an inline script in layout.tsx (no flash); this only toggles + persists it.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="p-2 rounded-full bg-card border border-border text-muted hover:text-foreground shadow-xs transition-colors cursor-pointer"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
