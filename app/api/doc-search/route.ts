import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import { guard } from "@/src/lib/api-guard";

// Keyword (substring, case-insensitive) search inside one document's chunks.
// Returns snippets with the PDF page when the chunk has one.
export async function POST(request: NextRequest) {
  try {
    const auth = await guard(request, "doc-search", 30);
    if (auth instanceof NextResponse) return auth;

    const { documentId, q } = await request.json().catch(() => ({}));
    const query = typeof q === "string" ? q.trim() : "";
    if (typeof documentId !== "string" || !documentId || query.length < 2 || query.length > 100) {
      return NextResponse.json({ error: "Enter at least 2 characters to search." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    // Service role bypasses RLS: confirm the document belongs to the caller
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("content, metadata")
      .eq("document_id", documentId)
      .ilike("content", pattern)
      .order("chunk_index", { ascending: true })
      .limit(30);
    if (error) throw error;

    const needle = query.toLowerCase();
    const seen = new Set<string>();
    const results: { page: number | null; snippet: string }[] = [];
    for (const c of chunks ?? []) {
      const i = c.content.toLowerCase().indexOf(needle);
      const start = Math.max(0, i - 60);
      const end = Math.min(c.content.length, i + query.length + 100);
      const snippet = `${start > 0 ? "…" : ""}${c.content.slice(start, end)}${end < c.content.length ? "…" : ""}`;
      const page: number | null = c.metadata?.page ?? null;
      const key = `${page}:${snippet}`;
      // chunks overlap by 200 chars, so the same hit can show up twice
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ page, snippet });
      }
    }
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Doc search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
