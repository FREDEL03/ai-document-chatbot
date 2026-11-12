import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import { chunkText } from "@/src/lib/chunk-text";
import { readImages } from "@/src/lib/read-images";
import { embedTexts } from "@/src/lib/embed";
import { guard } from "@/src/lib/api-guard";

export const maxDuration = 60;

// Define allowed file types and max size (4.5 MB for Vercel)
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5 MB limit for Vercel Serverless

export async function POST(request: NextRequest) {
  try {
    const auth = await guard(request, "upload", 10);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId;

    const supabaseAdmin = getSupabaseAdmin();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, images, TXT, DOC, DOCX are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10 MB limit." },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, "_");
    const filename = `${timestamp}_${originalName}`;
    const filePath = filename; // store at root of bucket

    // Upload to Supabase Storage bucket "documents"
    const { error: storageError } = await supabaseAdmin.storage
      .from("documents")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("Supabase storage upload error:", storageError);
      console.error("Bucket: documents, path:", filePath);
      return NextResponse.json(
        { error: `Failed to upload file to storage: ${storageError.message}` },
        { status: 500 }
      );
    }

    // Insert document metadata into "documents" table
    const { data: docData, error: docError } = await supabaseAdmin
      .from("documents")
      .insert({
        user_id: userId,
        filename: filename,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: filePath,
        extracted_text: "", // will update after extraction
        chunk_count: 0,
      })
      .select()
      .single();

    if (docError) {
      console.error("Supabase document insert error:", docError);
      // Optionally delete the uploaded storage file
      await supabaseAdmin.storage.from("documents").remove([filePath]);
      return NextResponse.json(
        { error: "Failed to save document metadata." },
        { status: 500 }
      );
    }

    const documentId = docData.id;
    let extractedText = "";
    let chunks: string[] = [];
    let imageReadFailed = false;
    let pdfPages: { num: number; text: string }[] | null = null; // per-page text, for page citations
    let pdfImageText = "";

    // Extract text based on file type
    if (file.type === "application/pdf") {
      // PDF text extraction (polyfill DOM globals for Node/Vercel serverless)
      try {
        if (typeof (globalThis as any).DOMMatrix === "undefined") {
          (globalThis as any).DOMMatrix = class DOMMatrix {
            constructor(_init?: any) {}
            multiply() { return this; }
            multiplySelf() { return this; }
            preMultiplySelf() { return this; }
            translate() { return this; }
            scale() { return this; }
            invertSelf() { return this; }
          };
        }
        if (typeof (globalThis as any).Path2D === "undefined") {
          (globalThis as any).Path2D = class Path2D {
            constructor(_init?: any) {}
            addPath() {}
          };
        }
        if (typeof (globalThis as any).ImageData === "undefined") {
          (globalThis as any).ImageData = class ImageData {
            constructor(_init?: any) {}
          };
        }

        // Preload worker into memory to bypass Vercel filesystem missing module error
        // @ts-ignore
        const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
        (globalThis as any).pdfjsWorker = pdfjsWorker;

        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        extractedText = result.text.replace(/\s+/g, " ").trim();
        pdfPages = result.pages.map((p) => ({ num: p.num, text: p.text.replace(/\s+/g, " ").trim() }));
        await parser.destroy();
        // Also read text/figures inside images (OCR via Gemini vision)
        const imageText = await readImages(buffer, file.type);
        if (imageText === null) imageReadFailed = true;
        else if (imageText) {
          pdfImageText = `[Image content: ${imageText.replace(/\s+/g, " ")}]`;
          extractedText += ` ${pdfImageText}`;
        }
      } catch (pdfError: any) {
        console.error("PDF extraction error:", pdfError);
        return NextResponse.json(
          { error: `Failed to extract text from PDF: ${pdfError?.message || "Unknown error"}` },
          { status: 500 }
        );
      }
    } else if (file.type === "text/plain") {
      // Plain text
      extractedText = buffer.toString("utf8").replace(/\s+/g, " ").trim();
    }
    else if (file.type.startsWith("image/")) {
      const imageText = await readImages(buffer, file.type);
      if (imageText === null) imageReadFailed = true;
      extractedText = (imageText ?? "").replace(/\s+/g, " ").trim();
    } else if (file.type.includes("wordprocessingml")) {
      const mammoth = await import("mammoth");
      extractedText = (await mammoth.extractRawText({ buffer })).value.replace(/\s+/g, " ").trim();
    } else if (file.type === "application/msword") {
      // @ts-expect-error no types
      const { default: WordExtractor } = await import("word-extractor");
      extractedText = (await new WordExtractor().extract(buffer)).getBody().replace(/\s+/g, " ").trim();
    }

    // If text extracted, chunk and save chunks
    if (extractedText) {
      // PDFs are chunked per page so each chunk knows its page number
      const items: { content: string; page?: number }[] = pdfPages
        ? [
            ...pdfPages.flatMap((p) => chunkText(p.text, 1000, 200).map((content) => ({ content, page: p.num }))),
            ...chunkText(pdfImageText, 1000, 200).map((content) => ({ content })),
          ]
        : chunkText(extractedText, 1000, 200).map((content) => ({ content }));
      chunks = items.map((i) => i.content);

      // Insert chunks into document_chunks table
      if (chunks.length > 0) {
        // Embeddings power semantic retrieval in chat; null just means "use fallback"
        const vectors = await embedTexts(chunks, "RETRIEVAL_DOCUMENT");
        const chunkRecords = chunks.map((content, index) => ({
          document_id: documentId,
          chunk_index: index,
          content,
          embedding: vectors ? JSON.stringify(vectors[index]) : null,
          metadata: { source: file.name, ...(items[index].page ? { page: items[index].page } : {}) },
        }));

        const { error: chunksError } = await supabaseAdmin
          .from("document_chunks")
          .insert(chunkRecords);

        if (chunksError) {
          console.error("Supabase chunks insert error:", chunksError);
        } else {
          // Update document with extracted text and chunk count
          await supabaseAdmin
            .from("documents")
            .update({
              extracted_text: extractedText.slice(0, 10000), // limit stored text
              chunk_count: chunks.length,
              updated_at: new Date().toISOString(),
            })
            .eq("id", documentId);
        }
      }
    }

    let signedUrl: string | null = null;
    const { data: urlData } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(filePath, 3600);
    if (urlData?.signedUrl) {
      signedUrl = urlData.signedUrl;
    }

    return NextResponse.json({
      success: true,
      documentId,
      filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      signedUrl,
      extracted: !!extractedText,
      imageReadFailed,
      chunkCount: chunks.length,
      message: "File uploaded and processed successfully.",
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error during upload" },
      { status: 500 }
    );
  }
}