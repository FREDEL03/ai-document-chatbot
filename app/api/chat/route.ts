import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const maxDuration = 30;

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

    const { message, document: documentName, documentId, userId } = body;
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

    // Retrieve document content from Supabase if document is selected
    let docContext = "";
    if (documentId || documentName) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        let targetId = documentId;

        if (!targetId && documentName) {
          let query = supabaseAdmin
            .from("documents")
            .select("id")
            .eq("original_name", documentName);
          if (userId) {
            query = query.eq("user_id", userId);
          }
          const { data: doc } = await query
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          targetId = doc?.id;
        }

        if (targetId) {
          const { data: chunks } = await supabaseAdmin
            .from("document_chunks")
            .select("content")
            .eq("document_id", targetId)
            .order("chunk_index", { ascending: true })
            .limit(30);

          if (chunks && chunks.length > 0) {
            docContext = chunks.map((c) => c.content).join("\n\n");
          } else {
            const { data: doc } = await supabaseAdmin
              .from("documents")
              .select("extracted_text")
              .eq("id", targetId)
              .maybeSingle();
            docContext = doc?.extracted_text || "";
          }
        }
      } catch (err) {
        console.warn("Failed to load document content from Supabase:", err);
      }
    }

    // Build prompt with document context or general conversational prompt
    let prompt = trimmed;
    if (docContext) {
      prompt = `Document Name: "${documentName || "Uploaded Document"}"\n\nDocument Content:\n"""\n${docContext}\n"""\n\nUser Question: ${trimmed}\n\nInstructions: Answer the question accurately using ONLY the document content above. If the document does not contain the answer, state clearly that the document does not mention it.`;
    } else if (documentName && typeof documentName === "string") {
      prompt = `The user has uploaded a document named "${documentName}". Please answer based on the content of that document if relevant.\n\nUser question: ${trimmed}`;
    } else {
      prompt = `You are DocuChat AI, a helpful, intelligent, and friendly AI assistant. The user hasn't uploaded a document yet, but you can chat with them normally, answer general questions, help brainstorm, or assist them with anything they need. Always be concise, helpful, and polite.\n\nUser: ${trimmed}`;
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

    return NextResponse.json({ answer });
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