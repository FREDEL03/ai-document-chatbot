import { getSupabaseClient } from "@/src/lib/supabase-client";

/** fetch() that attaches the signed-in user's Supabase access token for the API guards. */
export async function authFetch(url: string, init: RequestInit = {}) {
  const { data } = await getSupabaseClient().auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(url, { ...init, headers });
}
