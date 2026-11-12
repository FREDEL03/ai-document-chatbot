import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-embedding-001";
const DIMS = 768; // must match vector(768) in add-vector-search.sql
const BATCH = 100; // Gemini embedContent batch limit

/**
 * Embed texts with Gemini. Returns one vector per input, or null if embedding
 * failed (callers fall back to non-vector behavior).
 */
export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[][] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || texts.length === 0) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const res = await ai.models.embedContent({
        model: MODEL,
        contents: texts.slice(i, i + BATCH),
        config: { taskType, outputDimensionality: DIMS },
      });
      const vecs = res.embeddings?.map((e) => e.values ?? []) ?? [];
      if (vecs.length !== Math.min(BATCH, texts.length - i) || vecs.some((v) => v.length !== DIMS)) return null;
      out.push(...vecs);
    }
    return out;
  } catch (err) {
    console.warn("Embedding failed:", err);
    return null;
  }
}
