import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import { guard } from "@/src/lib/api-guard";

const MAX_MESSAGES = 200;
const MAX_TEXT = 20_000;
const MAX_SHARES_PER_USER = 50;
const NOT_SET_UP = ["42P01", "PGRST205"]; // table missing: add-shared-chats.sql not run yet

const notSetUp = () =>
  NextResponse.json(
    { error: "Sharing isn't set up yet. Run add-shared-chats.sql in the Supabase SQL editor." },
    { status: 501 }
  );

// Create a read-only snapshot of a chat and return its link id
export async function POST(request: NextRequest) {
  try {
    const auth = await guard(request, "share", 10);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body.messages)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    // Whitelist fields and cap sizes: this content becomes publicly readable
    const messages = body.messages.slice(0, MAX_MESSAGES).map((m: any) => ({
      sender: m?.sender === "user" ? "user" : "ai",
      text: String(m?.text ?? "").slice(0, MAX_TEXT),
      timestamp: typeof m?.timestamp === "string" ? m.timestamp.slice(0, 20) : undefined,
      sources: Array.isArray(m?.sources)
        ? m.sources.slice(0, 6).map((s: any) => ({
            name: String(s?.name ?? "").slice(0, 120),
            p: Number.isInteger(s?.p) ? s.p : null,
          }))
        : undefined,
    }));
    if (!messages.some((m: any) => m.sender === "user")) {
      return NextResponse.json({ error: "There's nothing to share yet. Ask a question first." }, { status: 400 });
    }
    const title = String(body.title ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || "Shared chat";
    const docNames = (Array.isArray(body.documentNames) ? body.documentNames : [])
      .slice(0, 5)
      .map((n: unknown) => String(n).slice(0, 120));

    const supabase = getSupabaseAdmin();
    const { count, error: countError } = await supabase
      .from("shared_chats")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId);
    if (countError && NOT_SET_UP.includes(countError.code ?? "")) return notSetUp();
    if ((count ?? 0) >= MAX_SHARES_PER_USER) {
      return NextResponse.json(
        { error: `You have ${MAX_SHARES_PER_USER} shared links. Delete some before creating more.` },
        { status: 400 }
      );
    }

    const id = randomBytes(16).toString("base64url"); // 128 bits: not guessable
    const { error } = await supabase
      .from("shared_chats")
      .insert({ id, user_id: auth.userId, title, doc_names: docNames, messages });
    if (error) {
      if (NOT_SET_UP.includes(error.code ?? "")) return notSetUp();
      throw error;
    }
    return NextResponse.json({ id });
  } catch (error) {
    console.error("Share create error:", error);
    return NextResponse.json({ error: "Could not create the link" }, { status: 500 });
  }
}

// The caller's own shared links
export async function GET(request: NextRequest) {
  try {
    const auth = await guard(request, "share-list", 60);
    if (auth instanceof NextResponse) return auth;

    const { data, error } = await getSupabaseAdmin()
      .from("shared_chats")
      .select("id, title, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(MAX_SHARES_PER_USER);
    if (error) {
      if (NOT_SET_UP.includes(error.code ?? "")) return notSetUp();
      throw error;
    }
    return NextResponse.json({ shares: data ?? [] });
  } catch (error) {
    console.error("Share list error:", error);
    return NextResponse.json({ error: "Could not load your shared links" }, { status: 500 });
  }
}

// Revoke a link: the page stops working immediately
export async function DELETE(request: NextRequest) {
  try {
    const auth = await guard(request, "share-delete", 60);
    if (auth instanceof NextResponse) return auth;

    const { id } = await request.json().catch(() => ({}));
    if (typeof id !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { error } = await getSupabaseAdmin().from("shared_chats").delete().eq("id", id).eq("user_id", auth.userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Share delete error:", error);
    return NextResponse.json({ error: "Could not delete the link" }, { status: 500 });
  }
}
