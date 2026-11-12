import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import { guard } from "@/src/lib/api-guard";

export async function GET(request: NextRequest) {
  try {
    const auth = await guard(request, "document", 60);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");

    if (!id && !name) {
      return NextResponse.json(
        { error: "Missing document id or name parameter" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from("documents")
      .select("id, original_name, storage_path, extracted_text, mime_type, file_size")
      .eq("user_id", userId); // service role bypasses RLS: only ever return the caller's own files

    if (id) {
      query = query.eq("id", id);
    } else if (name) {
      query = query.eq("original_name", name);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    let signedUrl: string | null = null;
    if (data.storage_path) {
      const { data: urlData, error: urlError } = await supabaseAdmin.storage
        .from("documents")
        .createSignedUrl(data.storage_path, 3600);

      if (!urlError && urlData?.signedUrl) {
        signedUrl = urlData.signedUrl;
      }
    }

    return NextResponse.json({
      success: true,
      documentId: data.id,
      originalName: data.original_name,
      mimeType: data.mime_type,
      signedUrl,
      extractedText: data.extracted_text || "",
    });
  } catch (error: any) {
    console.error("Document fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
