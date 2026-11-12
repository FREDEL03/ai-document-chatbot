"use client";

import { Languages } from "lucide-react";
import type { Lang } from "@/app/components/chat/types";

// Picks the language the AI answers in (and the language the mic listens for)
export function LanguageSelect({ value, onChange }: { value: Lang; onChange: (v: Lang) => void }) {
  return (
    <label
      className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground shadow-xs"
      title="Language for AI answers and voice input"
    >
      <Languages className="w-3.5 h-3.5 text-muted" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Lang)}
        className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer py-0.5"
      >
        <option value="auto">Auto</option>
        <option value="en">English</option>
        <option value="fil">Filipino</option>
      </select>
    </label>
  );
}
