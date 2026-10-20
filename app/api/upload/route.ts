import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import { chunkText } from "@/src/lib/chunk-text";
import { PDFParse } from "pdf-parse";

// Define allowed file types and max size (10 MB)
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
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
        { error: "Invalid file type. Only PDF, TXT, DOC, DOCX are allowed." },
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
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
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

    // Extract text based on file type
    if (file.type === "application/pdf") {
      // PDF text extraction
      try {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        extractedText = result.text.replace(/\s+/g, " ").trim();
        await parser.destroy();
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
    // TODO: handle DOC/DOCX (would need mammoth or similar)

    // If text extracted, chunk and save chunks
    if (extractedText) {
      chunks = chunkText(extractedText, 1000, 200);

      // Insert chunks into document_chunks table
      if (chunks.length > 0) {
        const chunkRecords = chunks.map((content, index) => ({
          document_id: documentId,
          chunk_index: index,
          content,
          metadata: { source: file.name },
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

    return NextResponse.json({
      success: true,
      documentId,
      filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      extracted: !!extractedText,
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