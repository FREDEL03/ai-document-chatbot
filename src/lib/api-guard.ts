import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

const WINDOW_MS = 60_000;
// ponytail: per-instance memory, so limits reset on cold start and aren't shared across
// serverless instances. Swap for Upstash/Redis or a Supabase table if abuse becomes real.
const hits = new Map<string, number[]>();

function tooMany(key: string, limit: number): number | null {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v[v.length - 1] >= WINDOW_MS) hits.delete(k);
  }
  return null;
}

/**
 * Verifies the Supabase access token (Authorization: Bearer ...) and applies a
 * per-user rate limit. Returns the verified user id, or a ready-made error response.
 */
export async function guard(
  request: NextRequest,
  bucket: string,
  limitPerMinute: number
): Promise<{ userId: string } | NextResponse> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  const wait = tooMany(`${bucket}:${data.user.id}`, limitPerMinute);
  if (wait !== null) {
    return NextResponse.json(
      { error: `Too many requests. Please wait ${wait}s and try again.` },
      { status: 429, headers: { "Retry-After": String(wait) } }
    );
  }
  return { userId: data.user.id };
}
