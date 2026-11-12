import JSZip from "jszip";
import readExcelFile from "read-excel-file/node";

const MAX_CHARS = 400_000; // keeps chunk/embedding count (and upload time) bounded

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

/** CSV is already text; keep rows on their own lines so the model can read it as a table. */
export function extractCsv(buffer: Buffer): string {
  return buffer.toString("utf8").replace(/^﻿/, "").slice(0, MAX_CHARS);
}

/** Every sheet as "[Sheet: name]" followed by one line per row, cells joined with " | ". */
export async function extractXlsx(buffer: Buffer): Promise<string> {
  const sheets = await readExcelFile(buffer);
  const cell = (c: unknown) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c));
  return sheets
    .map(({ sheet, data }) => `[Sheet: ${sheet}]\n${data.map((row) => row.map(cell).join(" | ")).join("\n")}`)
    .join("\n\n")
    .slice(0, MAX_CHARS);
}

/** Text of each slide as "[Slide N]" plus one line per paragraph. Speaker notes are not included. */
export async function extractPptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNum = (name: string) => Number(/slide(\d+)\.xml$/.exec(name)?.[1]);
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => slideNum(a) - slideNum(b));

  const out: string[] = [];
  for (const name of names) {
    const xml = await zip.file(name)!.async("string");
    const paragraphs = xml
      .split("</a:p>")
      .map((p) => [...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(""))
      .filter((p) => p.trim());
    out.push(`[Slide ${slideNum(name)}]\n${paragraphs.join("\n")}`);
  }
  return out.join("\n\n").slice(0, MAX_CHARS);
}
