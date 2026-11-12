import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import { guard } from "@/src/lib/api-guard";

export const maxDuration = 30;

const LANGUAGE_RULE: Record<string, string> = {
  en: "Write in English.",
  fil: "Write in Filipino (Tagalog), keeping technical terms and proper names as they are.",
};

const PROMPT = (name: string, text: string, language: unknown) => `You are summarizing an uploaded document named "${name}".

Return ONLY JSON of this exact shape:
{"summary": "<markdown>", "questions": ["<q1>", "<q2>", "<q3>"]}

Rules:
- "summary": 3-5 short markdown bullet points (- ) covering what the document is and its key points. Bold key terms. No heading.
- "questions": exactly 3 specific questions a reader could ask about THIS document, each under 80 characters.
- ${typeof language === "string" && Object.hasOwn(LANGUAGE_RULE, language) ? LANGUAGE_RULE[language] : "Write in the same language as the document (English, Filipino or Taglish)."}

DOCUMENT TEXT:
${text}`;

export async function POST(request: NextRequest) {
  try {
    const auth = await guard(request, "summary", 10);
    if (auth instanceof NextResponse) return auth;

    const { documentId, language } = await request.json().catch(() => ({}));
    if (typeof documentId !== "string" || !documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

    // Service role bypasses RLS: only summarize the caller's own document
    // (extracted_text is stored truncated to 10k chars at upload, plenty for a summary)
    const { data: doc } = await getSupabaseAdmin()
      .from("documents")
      .select("original_name, extracted_text")
      .eq("id", documentId)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (!doc.extracted_text?.trim()) {
      return NextResponse.json({ error: "No readable text to summarize" }, { status: 422 });
    }

    const ai = new GoogleGenAI({ apiKey });
    let lastError: unknown = null;
    for (const model of ["gemini-2.5-flash", "gemini-3-flash-preview"]) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: PROMPT(doc.original_name, doc.extracted_text, language),
          config: { responseMimeType: "application/json" },
        });
        const raw = (res.text ?? "").replace(/^```(?:json)?|```$/gm, "").trim();
        const parsed = JSON.parse(raw);
        const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
        const questions = Array.isArray(parsed.questions)
          ? parsed.questions.filter((q: unknown) => typeof q === "string" && q.trim()).slice(0, 3)
          : [];
        if (summary) return NextResponse.json({ summary, questions });
      } catch (err) {
        lastError ??= err;
        console.warn(`Summary with ${model} failed:`, err);
      }
    }
    console.error("Summary failed:", lastError);
    return NextResponse.json({ error: "Could not summarize this document" }, { status: 502 });
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
