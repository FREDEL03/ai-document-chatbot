import { GoogleGenAI } from "@google/genai";

const PROMPT =
  "Extract all text visible inside images, figures, screenshots or scanned pages of this file, and briefly describe any chart, diagram or photo. " +
  "Ignore normal selectable body text. Output plain text only. If there are no images, reply exactly: NONE";

// Uses Gemini vision to read image content (PDF pages/figures or a standalone image). Returns "" on failure.
export async function readImages(data: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";
  const ai = new GoogleGenAI({ apiKey });
  const deadline = Date.now() + 25_000; // stay under the route's maxDuration
  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
    const left = deadline - Date.now();
    if (left < 3000) break;
    try {
      const res = await ai.models.generateContent({
        model,
        config: { abortSignal: AbortSignal.timeout(left) },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: data.toString("base64") } }, { text: PROMPT }] }],
      });
      const text = res.text?.trim() || "";
      return /^NONE\b/i.test(text) ? "" : text;
    } catch (err) {
      console.warn(`Image read with ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return "";
}
