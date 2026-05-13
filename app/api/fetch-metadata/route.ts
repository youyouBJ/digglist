import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { extractTimestampFromUrl } from "@/lib/timestamp";

/* ─── HTML helpers ───────────────────────────────────────────────────────── */

function extractMeta(html: string, property: string): string {
  const patterns = [
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
    `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
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
  if (/open\.spotify\.com/.test(url))      return "Spotify";
  if (/bandcamp\.com/.test(url))           return "Bandcamp";
  if (/discogs\.com/.test(url))            return "Discogs";
  if (/tiktok\.com/.test(url))             return "TikTok";
  if (/instagram\.com/.test(url))          return "Instagram";
  return "Other";
}

function splitArtistTitle(raw: string): { title: string; artist: string } {
  const separators = [" - ", " – ", " — "];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      return { artist: raw.slice(0, idx).trim(), title: raw.slice(idx + sep.length).trim() };
    }
  }
  return { title: raw.trim(), artist: "" };
}

function getYouTubeThumbnail(url: string): string {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : "";
}

const BROWSER_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":      BROWSER_UA,
        Accept:            "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;

    const reader = res.body?.getReader();
    const MAX    = 500_000;
    const chunks: Uint8Array[] = [];
    let   total  = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        total += value.byteLength;
        if (total >= MAX) break;
      }
    }
    return new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const m = new Uint8Array(acc.length + c.length);
        m.set(acc); m.set(c, acc.length);
        return m;
      }, new Uint8Array())
    );
  } catch {
    return null;
  }
}

/* ─── Platform-specific fetchers ─────────────────────────────────────────── */

interface Meta { title: string; artist: string; imageUrl: string; notes?: string }

async function fetchYouTube(url: string): Promise<Meta | null> {
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res    = await fetch(oembed, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
    const { title, artist } = splitArtistTitle(data.title ?? "");
    return {
      title,
      artist:   data.author_name ?? artist,
      imageUrl: data.thumbnail_url ?? getYouTubeThumbnail(url),
    };
  } catch {
    return null;
  }
}

async function fetchSoundCloud(url: string): Promise<Meta | null> {
  try {
    const oembed = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res    = await fetch(oembed, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
    const { title, artist } = splitArtistTitle(data.title ?? "");
    return {
      title,
      artist:   data.author_name ?? artist,
      imageUrl: data.thumbnail_url ?? "",
    };
  } catch {
    return null;
  }
}

async function fetchTikTok(url: string): Promise<Meta | null> {
  try {
    const oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const res    = await fetch(oembed, {
      headers: { "User-Agent": BROWSER_UA },
      signal:  AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      title?: string; author_name?: string; thumbnail_url?: string;
    };
    const caption = data.title ?? "";
    const { title: splitTitle, artist: splitArtist } = splitArtistTitle(caption);
    const hasArtistTitle = splitTitle && splitArtist;
    return {
      title:    hasArtistTitle ? splitTitle : "",
      artist:   hasArtistTitle ? splitArtist : (data.author_name ?? ""),
      imageUrl: data.thumbnail_url ?? "",
      notes:    hasArtistTitle ? "" : caption,
    };
  } catch {
    return null;
  }
}

async function fetchInstagram(url: string): Promise<Meta | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const image       = extractMeta(html, "og:image");
  const description = extractMeta(html, "og:description");
  const siteName    = extractMeta(html, "og:site_name");
  const author      = extractMeta(html, "article:author") || siteName;

  return {
    title:    "",
    artist:   author,
    imageUrl: image,
    notes:    description,
  };
}

async function fetchBandcamp(url: string): Promise<Meta | null> {
  try {
    const oembed = `https://bandcamp.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res    = await fetch(oembed, {
      headers: { "User-Agent": BROWSER_UA },
      signal:  AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
      const rawTitle = data.title ?? "";
      if (rawTitle || data.author_name) {
        const { title, artist } = splitArtistTitle(rawTitle);
        return {
          title:    title || rawTitle,
          artist:   data.author_name ?? artist,
          imageUrl: data.thumbnail_url ?? "",
        };
      }
    }
  } catch { /* fall through to HTML */ }

  /* HTML fallback — og:title format: "Album Name, by Artist Name" */
  const html = await fetchHtml(url);
  if (!html) return null;
  const rawTitle = extractMeta(html, "og:title") || extractTitle(html);
  const byMatch  = rawTitle.match(/^(.+),\s*by\s+(.+)$/i);
  if (byMatch) {
    return { title: byMatch[1].trim(), artist: byMatch[2].trim(), imageUrl: extractMeta(html, "og:image") };
  }
  const { title, artist } = splitArtistTitle(rawTitle);
  return { title: title || rawTitle, artist, imageUrl: extractMeta(html, "og:image") };
}

async function fetchSpotify(url: string): Promise<Meta | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const ogTitle   = extractMeta(html, "og:title");
  const pageTitle = extractTitle(html);
  /* Page title formats:
     "Track Name - song and lyrics by Artist | Spotify"
     "Album Name - Album by Artist | Spotify"  */
  const artistMatch = pageTitle.match(/ by ([^|]+?)\s*\|\s*Spotify\s*$/i);
  const artist      = artistMatch ? artistMatch[1].trim() : "";
  return {
    title:    ogTitle || "",
    artist,
    imageUrl: extractMeta(html, "og:image"),
  };
}

async function fetchDiscogs(url: string): Promise<Meta | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const rawTitle = extractMeta(html, "og:title") || extractTitle(html);
  const cleaned  = rawTitle.replace(/ \| Discogs$/, "").replace(/ - Discogs$/, "").trim();
  const { title, artist } = splitArtistTitle(cleaned);
  return {
    title,
    artist,
    imageUrl: extractMeta(html, "og:image"),
  };
}

async function fetchGeneric(url: string): Promise<Meta | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const rawTitle = extractMeta(html, "og:title") || extractTitle(html);
  const { title, artist } = splitArtistTitle(rawTitle);
  return {
    title,
    artist,
    imageUrl: extractMeta(html, "og:image"),
    notes:    extractMeta(html, "og:description"),
  };
}

/* ─── Route ──────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token      = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(rawUrl); }
  catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported" }, { status: 400 });
  }

  const url      = parsed.toString();
  const platform = detectPlatform(url);
  const timestamp = extractTimestampFromUrl(url);

  let meta: Meta | null = null;
  try {
    if (platform === "YouTube")        meta = await fetchYouTube(url);
    else if (platform === "SoundCloud") meta = await fetchSoundCloud(url);
    else if (platform === "Spotify")    meta = await fetchSpotify(url);
    else if (platform === "Bandcamp")   meta = await fetchBandcamp(url);
    else if (platform === "TikTok")     meta = await fetchTikTok(url);
    else if (platform === "Instagram")  meta = await fetchInstagram(url);
    else if (platform === "Discogs")    meta = await fetchDiscogs(url);
    else                                meta = await fetchGeneric(url);
  } catch {
    /* ignore — meta stays null */
  }

  /* Graceful fallback: return empty strings rather than an error */
  return NextResponse.json({
    title:     meta?.title    ?? "",
    artist:    meta?.artist   ?? "",
    notes:     meta?.notes    ?? "",
    platform,
    sourceUrl: url,
    imageUrl:  meta?.imageUrl ?? "",
    timestamp,
  });
}
