import { GoogleGenAI } from "@google/genai";

const PROMPT =
  "Extract all text visible inside images, figures, screenshots or scanned pages of this file, and briefly describe any chart, diagram or photo. " +
  "Ignore normal selectable body text. Output plain text only. If there are no images, reply exactly: NONE";

// Uses Gemini vision to read image content (PDF pages/figures or a standalone image).
// Returns "" when there is nothing to read, null when the service failed (e.g. 503 high demand) after retries.
export async function readImages(data: Buffer, mimeType: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const deadline = Date.now() + 40_000; // stay under the route's maxDuration
  const models = ["gemini-2.5-flash", "gemini-3-flash-preview"];
  for (let attempt = 0; attempt < 6; attempt++) {
    const left = deadline - Date.now();
    if (left < 5000) break;
    try {
      const res = await ai.models.generateContent({
        model: models[attempt % models.length],
        config: { abortSignal: AbortSignal.timeout(left) },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: data.toString("base64") } }, { text: PROMPT }] }],
      });
      const text = res.text?.trim() || "";
      return /^NONE/i.test(text) ? "" : text;
    } catch (err) {
      console.warn(`Image read attempt ${attempt + 1} failed:`, err instanceof Error ? err.message.slice(0, 160) : err);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return null;
}
