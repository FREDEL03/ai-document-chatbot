import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";

/** True for loopback, private, link-local (incl. cloud metadata 169.254.x), CGNAT and other non-public addresses. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) {
    const rest = v.slice(7);
    return rest.includes(".") ? isPrivateIp(rest) : true; // hex-mapped form: just refuse
  }
  return v === "::1" || v === "::" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}

type Page = { status: number; headers: http.IncomingHttpHeaders; body: Buffer };

function get(url: URL, timeoutMs: number, maxBytes: number): Promise<Page> {
  return new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? https : http).request(
      url,
      {
        method: "GET",
        headers: { "user-agent": "DocuChatBot/1.0", accept: "text/html,text/plain;q=0.9,*/*;q=0.1" },
        // The address is checked at connect time, so DNS rebinding can't swap in a private IP after validation
        lookup: ((host: string, opts: any, cb: any) => {
          dns.lookup(host, opts, (err, address, family) => {
            const list = Array.isArray(address) ? address : [{ address, family }];
            if (!err && list.some((a: any) => isPrivateIp(a.address))) err = new Error("Blocked address") as any;
            cb(err, address, family);
          });
        }) as any,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > maxBytes) return req.destroy(new Error("That page is too large"));
          chunks.push(c);
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("The page took too long to respond")));
    req.on("error", reject);
    req.end();
  });
}

/** GET a public http(s) page (follows up to 4 redirects, re-validating each hop). Never reaches private networks. */
export async function fetchPublicPage(input: string, opts: { timeoutMs?: number; maxBytes?: number } = {}) {
  let url = new URL(input);
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https links are supported");
    if (url.port && url.port !== "80" && url.port !== "443") throw new Error("That address isn't allowed");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) && isPrivateIp(host)) throw new Error("That address isn't allowed");

    const page = await get(url, opts.timeoutMs ?? 10_000, opts.maxBytes ?? 2_000_000);
    const location = page.headers.location;
    if (page.status >= 300 && page.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (page.status < 200 || page.status >= 300) throw new Error(`The site answered with status ${page.status}`);
    return { url: url.toString(), contentType: String(page.headers["content-type"] ?? ""), body: page.body };
  }
  throw new Error("Too many redirects");
}
