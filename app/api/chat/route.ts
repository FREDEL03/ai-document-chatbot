import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const maxDuration = 30;

interface CacheEntry {
  answer: string;
  createdAt: number;
  expiresAt: number;
}

// Global in-memory cache for repeated questions (key: userId + docIds + normalized question)
const qaCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

function buildCacheKey(question: string, docIdentifiers: string[], userId?: string | null): string {
  const normQ = question.toLowerCase().trim().replace(/\s+/g, " ");
  const sortedDocs = [...docIdentifiers].sort().join("|");
  return `${userId || "global"}::${sortedDocs}::${normQ}`;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body first
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { message, document: documentName, documentId, documentIds, documents: docsPayload, userId } = body;
    if (typeof message !== "string") {
      return NextResponse.json(
        { error: "Field 'message' must be a string" },
        { status: 400 }
      );
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty or whitespace" },
        { status: 400 }
      );
    }
    if (trimmed.length > 4000) {
      return NextResponse.json(
        { error: "Message exceeds maximum length of 4000 characters" },
        { status: 400 }
      );
    }

    const useMock = process.env.NEXT_PUBLIC_MOCK_AI === "true";

    // Debug log
    console.log("Chat API:", { useMock, documentName, trimmed });

    if (useMock) {
      // Mock response for testing
      await new Promise(resolve => setTimeout(resolve, 500));
      let answer = "";
      if (documentName && typeof documentName === "string") {
        // Document-aware mock responses based on document name AND question
        const lowerDoc = documentName.toLowerCase();
        const lowerQuestion = trimmed.toLowerCase();

        // Water-related questions
        if (lowerDoc.includes("water") || lowerQuestion.includes("water") || lowerQuestion.includes("drink") || lowerQuestion.includes("glass")) {
          answer = "Based on the uploaded document, adults should drink 8-10 glasses (about 2 liters) of water daily, depending on activity level and climate.";
        }
        // Diet/nutrition questions
        else if (lowerDoc.includes("diet") || lowerDoc.includes("food") || lowerQuestion.includes("diet") || lowerQuestion.includes("nutrition") || lowerQuestion.includes("eat")) {
          answer = "According to the uploaded document, a balanced diet includes fruits, vegetables, lean proteins, and whole grains.";
        }
        // Health/fitness questions
        else if (lowerDoc.includes("health") || lowerDoc.includes("fitness") || lowerQuestion.includes("exercise") || lowerQuestion.includes("fitness")) {
          answer = "The document recommends regular exercise and balanced nutrition for overall wellness.";
        }
        // Sample document questions
        else if (lowerDoc.includes("sample")) {
          answer = "The SAMPLE document contains example content for testing purposes. It typically includes placeholder text to demonstrate formatting and structure.";
        }
        // General document response
        else {
          answer = `I've reviewed "${documentName}". The document covers relevant information to your question. For specific details, please refer to the document sections.`;
        }
      } else {
        // General mock responses
        const mockAnswers = [
          "I'm a mock AI response. This is a test.",
          "Hello! I'm here to help with your documents.",
          "I can assist you with questions about uploaded documents."
        ];
        answer = mockAnswers[Math.floor(Math.random() * mockAnswers.length)];
      }
      return NextResponse.json({ answer });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY in environment");
      return NextResponse.json(
        { error: "Server configuration error: missing API key" },
        { status: 500 }
      );
    }

    // Collect all target documents (supports multiple files up to 5)
    const docItems: Array<{ id?: string; name?: string }> = [];
    if (Array.isArray(docsPayload) && docsPayload.length > 0) {
      docsPayload.forEach((d: any) => {
        if (d && (d.id || d.name)) docItems.push({ id: d.id, name: d.name });
      });
    } else if (Array.isArray(documentIds) && documentIds.length > 0) {
      documentIds.forEach((id: string) => {
        if (id) docItems.push({ id });
      });
    } else if (documentId || documentName) {
      docItems.push({ id: documentId, name: documentName });
    }

    // Check in-memory Q&A cache before document retrieval or AI generation
    const docIdentifiers = docItems.map((d) => d.id || d.name || "").filter(Boolean);
    const cacheKey = buildCacheKey(trimmed, docIdentifiers, userId);

    const cached = qaCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({ answer: cached.answer, cached: true });
    }

    // Retrieve document content from Supabase for all selected documents
    let docContext = "";
    if (docItems.length > 0) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const docContextParts: string[] = [];

        for (const item of docItems.slice(0, 5)) {
          let targetId = item.id;
          let docTitle = item.name || "Document";

          if (!targetId && item.name) {
            let query = supabaseAdmin
              .from("documents")
              .select("id, original_name")
              .eq("original_name", item.name);
            if (userId) query = query.eq("user_id", userId);
            const { data: found } = await query
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            targetId = found?.id;
            if (found?.original_name) docTitle = found.original_name;
          }

          if (targetId) {
            if (!item.name) {
              const { data: meta } = await supabaseAdmin
                .from("documents")
                .select("original_name")
                .eq("id", targetId)
                .maybeSingle();
              if (meta?.original_name) docTitle = meta.original_name;
            }

            const { data: chunks } = await supabaseAdmin
              .from("document_chunks")
              .select("content")
              .eq("document_id", targetId)
              .order("chunk_index", { ascending: true })
              .limit(20);

            let content = "";
            if (chunks && chunks.length > 0) {
              content = chunks.map((c) => c.content).join("\n\n");
            } else {
              const { data: docRecord } = await supabaseAdmin
                .from("documents")
                .select("extracted_text")
                .eq("id", targetId)
                .maybeSingle();
              content = docRecord?.extracted_text || "";
            }

            if (content.trim()) {
              docContextParts.push(`=== DOCUMENT: "${docTitle}" ===\n${content.trim()}`);
            }
          }
        }

        if (docContextParts.length > 0) {
          docContext = docContextParts.join("\n\n--------------------\n\n");
        }
      } catch (err) {
        console.warn("Failed to load document content from Supabase:", err);
      }
    }

    // Build prompt with document context or general conversational prompt
    let prompt = trimmed;
    if (docContext) {
      prompt = `Available Uploaded Documents (${docItems.length}):
${docContext}

User Question: ${trimmed}

Instructions for Response Formatting & Clarity:
1. Answer accurately based on the provided document(s) above. If multiple documents are provided, cite which document each fact comes from. If none of the documents contain the answer, state that clearly.
2. Structure your answer to be clean, organized, and very easy to read:
   - Use clear markdown headings (## or ###) to separate topics or sections.
   - Use bullet points (- ) or numbered lists (1. ) for items, tasks, key points, or status updates.
   - Bold (**key terms**, dates, status, action items) for quick scanning.
   - If the data has dates, tasks, or tabular info, format it with a clean markdown table.
   - Avoid long unbroken paragraphs. Keep explanations concise and bite-sized.
   - Respond in the language used by the user (English or Filipino/Taglish).`;
    } else if (documentName && typeof documentName === "string") {
      prompt = `The user has uploaded a document named "${documentName}". Please answer based on the content of that document if relevant.

User question: ${trimmed}

Formatting guidelines:
- Use clean headings, bullet points, and bold key terms.
- Avoid dense walls of text. Make the response scannable and easy to digest.`;
    } else {
      prompt = `You are DocuChat AI, a helpful, intelligent, and friendly AI assistant. The user hasn't uploaded a document yet.
Formatting guidelines:
- Always format your answers cleanly using markdown headings, bullet points, and bold key phrases.
- Keep responses readable, friendly, and structured.
- Respond in the language of the user.

User: ${trimmed}`;
    }

    // Call Gemini with fallback model support
    const ai = new GoogleGenAI({ apiKey });
    let answer = "";
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        const partText = result.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "";
        answer = partText.trim() || result.text?.trim() || "";
        if (answer) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next:`, err?.message || err);
      }
    }

    if (!answer) {
      console.error("Gemini returned empty answer. Last error:", lastError);
      return NextResponse.json(
        { error: lastError?.message || "AI service returned empty response" },
        { status: 502 }
      );
    }

    // Cache the newly generated answer
    if (qaCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = qaCache.keys().next().value;
      if (oldestKey) qaCache.delete(oldestKey);
    }
    qaCache.set(cacheKey, {
      answer,
      createdAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ answer, cached: false });
  } catch (error: any) {
    console.error("Chat API error:", error);

    // Handle Gemini API rate limits / high demand
    if (error?.status === 503 || error?.message?.includes("high demand")) {
      return NextResponse.json(
        { error: "AI service is currently experiencing high demand. Please try again in a moment." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}