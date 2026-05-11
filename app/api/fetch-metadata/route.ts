import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { extractTimestampFromUrl } from "@/lib/timestamp";

function extractMeta(html: string, property: string): string {
  const patterns = [
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"'<>]+)["']`,
    `<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']${property}["']`,
    `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"'<>]+)["']`,
    `<meta[^>]+content=["']([^"'<>]+)["'][^>]+name=["']${property}["']`,
  ];
  for (const p of patterns) {
    const m = html.match(new RegExp(p, "i"));
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : "";
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url))  return "YouTube";
  if (/soundcloud\.com/.test(url))         return "SoundCloud";
  if (/discogs\.com/.test(url))            return "Discogs";
  if (/tiktok\.com/.test(url))             return "TikTok";
  if (/instagram\.com/.test(url))          return "Instagram";
  return "Other";
}

function getYouTubeThumbnail(url: string): string {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : "";
}

function splitArtistTitle(raw: string): { title: string; artist: string } {
  const sep = raw.indexOf(" - ");
  if (sep !== -1) {
    return { artist: raw.slice(0, sep).trim(), title: raw.slice(sep + 3).trim() };
  }
  return { title: raw.trim(), artist: "" };
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/ [-–|] YouTube$/, "")
    .replace(/ - Free Listening on SoundCloud$/, "")
    .replace(/ \| Discogs$/, "")
    .replace(/ \| Free Music, Bio, Tours, Photos, Videos$/, "")
    .trim();
}

export async function GET(request: NextRequest) {
  // Authenticate request
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate target URL
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported" }, { status: 400 });
  }

  const platform = detectPlatform(parsed.toString());

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch page (HTTP ${res.status})` },
        { status: 422 }
      );
    }

    // Limit HTML read to 500 KB to avoid loading huge pages into memory
    const reader = res.body?.getReader();
    const MAX_BYTES = 500_000;
    const chunks: Uint8Array[] = [];
    let total = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        total += value.byteLength;
        if (total >= MAX_BYTES) break;
      }
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc);
        merged.set(chunk, acc.length);
        return merged;
      }, new Uint8Array())
    );

    const rawTitle = cleanTitle(extractMeta(html, "og:title") || extractTitle(html));
    const { title, artist } = splitArtistTitle(rawTitle);

    const imageUrl =
      platform === "YouTube"
        ? getYouTubeThumbnail(parsed.toString()) || extractMeta(html, "og:image")
        : extractMeta(html, "og:image");

    const timestamp = extractTimestampFromUrl(parsed.toString());
    return NextResponse.json({ title, artist, platform, sourceUrl: parsed.toString(), imageUrl, timestamp });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "Request timed out — the site took too long to respond."
        : err instanceof Error
        ? err.message
        : "Failed to fetch metadata";

    return NextResponse.json({ error: message }, { status: 422 });
  }
}
