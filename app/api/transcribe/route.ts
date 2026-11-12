import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { guard } from "@/src/lib/api-guard";

export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // the client sends 16 kHz mono WAV, ~1.9 MB per minute

const HINT: Record<string, string> = {
  en: "The speaker is using English.",
  fil: "The speaker is using Filipino (Tagalog), possibly mixed with English (Taglish).",
};

// Fallback for browsers whose built-in speech recognition doesn't work (Brave, Firefox, blocked Google speech service)
export async function POST(request: NextRequest) {
  try {
    const auth = await guard(request, "transcribe", 10);
    if (auth instanceof NextResponse) return auth;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

    const form = await request.formData();
    const audio = form.get("audio");
    const language = String(form.get("language") ?? "auto");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "No audio received." }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ error: "That recording is too long. Keep it under a minute." }, { status: 413 });
    }

    const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const prompt =
      "Transcribe this audio exactly as spoken. Output only the transcript text, with no quotes, labels or commentary. " +
      "If there is no speech, output nothing. " +
      (Object.hasOwn(HINT, language) ? HINT[language] : "");

    const ai = new GoogleGenAI({ apiKey });
    let lastError: unknown = null;
    for (const model of ["gemini-2.5-flash", "gemini-3-flash-preview"]) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ inlineData: { mimeType: "audio/wav", data } }, { text: prompt }] }],
        });
        return NextResponse.json({ text: (res.text ?? "").trim() });
      } catch (err) {
        lastError ??= err;
        console.warn(`Transcribe with ${model} failed:`, err);
      }
    }
    console.error("Transcribe failed:", lastError);
    return NextResponse.json({ error: "Could not transcribe that. Please try again." }, { status: 502 });
  } catch (error) {
    console.error("Transcribe API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
