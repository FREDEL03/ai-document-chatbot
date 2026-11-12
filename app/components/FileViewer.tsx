"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Visual viewer for TXT / DOCX (fetched from signed URL). DOC falls back to extracted text.
export function FileViewer({ url, name, fallbackText }: { url: string; name: string; fallbackText: string | null }) {
  const ext = name.toLowerCase().split(".").pop();
  const box = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(ext === "txt" || ext === "docx");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ext !== "txt" && ext !== "docx") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        if (ext === "txt") {
          const t = await res.text();
          if (!cancelled) setText(t);
        } else {
          const blob = await res.blob();
          const { renderAsync } = await import("docx-preview");
          if (!cancelled && box.current) {
            box.current.innerHTML = "";
            await renderAsync(blob, box.current, undefined, { inWrapper: true, ignoreWidth: false });
          }
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, ext]);

  const showText = ext === "txt" ? text : fallbackText;
  const asText = ext !== "docx" || failed;

  // Legacy .doc can't be rendered in-browser: use Microsoft's Office viewer (needs a publicly reachable URL)
  if (ext === "doc") {
    return (
      <iframe
        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
        className="w-full h-full border-0 bg-card"
        title="Document preview"
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-card relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
          <Loader2 className="w-7 h-7 text-[#5B6CFF] animate-spin" />
        </div>
      )}
      {ext === "docx" && !failed && <div ref={box} className="docx-viewer" />}
      {asText && (
        <div className="p-5 text-foreground text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono select-text">
          {showText || "No content found in this file."}
        </div>
      )}
    </div>
  );
}
