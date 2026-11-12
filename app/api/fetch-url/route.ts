import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/src/lib/api-guard";
import { fetchPublicPage } from "@/src/lib/safe-fetch";

export const maxDuration = 30;

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

// ponytail: regex tag stripping, not a real readability parser. Menus/cookie text may leak in,
// and JavaScript-rendered pages come back empty. Swap in @mozilla/readability + jsdom if quality matters.
function htmlToText(html: string) {
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const text = decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template|head|nav|footer|aside|form|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|ul|ol|table|blockquote)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[^\S\n]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  return { title, text };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await guard(request, "fetch-url", 10);
    if (auth instanceof NextResponse) return auth;

    const { url } = await request.json().catch(() => ({}));
    let parsed: URL;
    try {
      parsed = new URL(typeof url === "string" ? url.trim() : "");
    } catch {
      return NextResponse.json({ error: "Please enter a valid link (starting with https://)." }, { status: 400 });
    }

    let page;
    try {
      page = await fetchPublicPage(parsed.toString());
    } catch (err: any) {
      return NextResponse.json({ error: `Could not open that link: ${err?.message || "unknown error"}` }, { status: 422 });
    }

    if (!/text\/(html|plain)|application\/xhtml/i.test(page.contentType)) {
      return NextResponse.json(
        { error: "Only web pages are supported here. For files, download them and upload instead." },
        { status: 422 }
      );
    }

    const raw = page.body.toString("utf8");
    const isHtml = /html/i.test(page.contentType);
    const { title, text } = isHtml ? htmlToText(raw) : { title: "", text: raw.trim() };
    if (text.length < 50) {
      return NextResponse.json(
        { error: "No readable text found on that page (it may need JavaScript to load)." },
        { status: 422 }
      );
    }

    const host = new URL(page.url).hostname.replace(/^www\./, "");
    const label = (title ? `${host} - ${title}` : host).replace(/[\\/:*?"<>|%]/g, "").slice(0, 80).trim();
    return NextResponse.json({
      name: `${label}.txt`,
      text: `Source: ${page.url}\n${title ? `Title: ${title}\n` : ""}\n${text}`.slice(0, 1_000_000),
    });
  } catch (error) {
    console.error("Fetch URL error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
