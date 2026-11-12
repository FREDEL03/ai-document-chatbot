import type { Message, UploadedDoc } from "@/app/components/chat/types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const today = () => new Date().toISOString().slice(0, 10);

/** Download the conversation as a .md file (answers are already markdown). */
export function exportMarkdown(messages: Message[], documents: UploadedDoc[]) {
  const lines = [
    "# DocuChat AI conversation",
    "",
    `Exported: ${new Date().toLocaleString()}`,
    ...(documents.length ? [`Documents: ${documents.map((d) => d.name).join(", ")}`] : []),
    "",
    "---",
    "",
  ];
  for (const m of messages) {
    lines.push(`**${m.sender === "user" ? "You" : "DocuChat AI"}**${m.timestamp ? ` (${m.timestamp})` : ""}`, "", m.text, "");
    const cites = (m.sources ?? [])
      .map((s) => {
        const name = documents.find((d) => d.id === s.d)?.name;
        return name ? `${name}${s.p ? ` p.${s.p}` : ""}` : null;
      })
      .filter(Boolean);
    if (cites.length) lines.push(`_Sources: ${cites.join("; ")}_`, "");
    lines.push("---", "");
  }
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `docuchat-${today()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Save as PDF via the browser's print dialog ("Save as PDF"): prints a copy of the
 * already-rendered chat in a hidden iframe, with the page's CSS inlined. No PDF library needed.
 */
export function exportPdf(documents: UploadedDoc[]) {
  const src = document.getElementById("chat-messages");
  if (!src) return;
  const clone = src.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-no-export]").forEach((el) => el.remove());

  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css += Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
    } catch {} // cross-origin sheet: skip
  }

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;height:600px;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>DocuChat AI conversation ${today()}</title>` +
      `<style>${css}</style><style>body{background:#fff;padding:24px;font-family:sans-serif}</style></head><body>` +
      `<h1 style="font-size:20px;font-weight:700;margin:0 0 4px">DocuChat AI conversation</h1>` +
      `<p style="font-size:12px;color:#6B6B73;margin:0 0 16px">${esc(new Date().toLocaleString())}` +
      `${documents.length ? " · " + esc(documents.map((d) => d.name).join(", ")) : ""}</p>` +
      `${clone.outerHTML}</body></html>`
  );
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 2000);
  }, 300);
}
