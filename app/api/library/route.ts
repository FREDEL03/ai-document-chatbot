import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import { guard } from "@/src/lib/api-guard";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 24;
const NO_TAGS_COLUMN = "42703"; // Postgres: undefined_column (add-document-tags.sql not run yet)

// All of the signed-in user's uploaded documents (the Library)
export async function GET(request: NextRequest) {
  try {
    const auth = await guard(request, "library", 60);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabaseAdmin();
    const cols = "id, original_name, file_size, created_at";
    let tagsEnabled = true;
    let { data, error }: { data: any[] | null; error: { code?: string } | null } = await supabase
      .from("documents")
      .select(`${cols}, tags`)
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error?.code === NO_TAGS_COLUMN) {
      // Library still works without tags until the SQL is run
      tagsEnabled = false;
      ({ data, error } = await supabase
        .from("documents")
        .select(cols)
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(200));
    }
    if (error) throw error;

    return NextResponse.json({
      tagsEnabled,
      documents: (data ?? []).map((d: any) => ({
        id: d.id,
        name: d.original_name,
        size: d.file_size,
        createdAt: d.created_at,
        tags: d.tags ?? [],
      })),
    });
  } catch (error) {
    console.error("Library list error:", error);
    return NextResponse.json({ error: "Could not load your library" }, { status: 500 });
  }
}

// Replace a document's tags
export async function PATCH(request: NextRequest) {
  try {
    const auth = await guard(request, "library-edit", 60);
    if (auth instanceof NextResponse) return auth;

    const { documentId, tags } = await request.json().catch(() => ({}));
    if (typeof documentId !== "string" || !Array.isArray(tags)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Trim, drop empties/duplicates (case-insensitive), cap the count and length
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const t of tags) {
      const tag = typeof t === "string" ? t.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH) : "";
      if (tag && !seen.has(tag.toLowerCase())) {
        seen.add(tag.toLowerCase());
        clean.push(tag);
      }
    }
    if (clean.length > MAX_TAGS) {
      return NextResponse.json({ error: `You can add up to ${MAX_TAGS} tags per document.` }, { status: 400 });
    }

    // Service role bypasses RLS: only touch the caller's own document
    const { data, error } = await getSupabaseAdmin()
      .from("documents")
      .update({ tags: clean })
      .eq("id", documentId)
      .eq("user_id", auth.userId)
      .select("id")
      .maybeSingle();
    if (error?.code === NO_TAGS_COLUMN) {
      return NextResponse.json(
        { error: "Tags aren't set up yet. Run add-document-tags.sql in the Supabase SQL editor." },
        { status: 501 }
      );
    }
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    return NextResponse.json({ tags: clean });
  } catch (error) {
    console.error("Library tag error:", error);
    return NextResponse.json({ error: "Could not save tags" }, { status: 500 });
  }
}
