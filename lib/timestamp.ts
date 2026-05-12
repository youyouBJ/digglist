/**
 * Parses a manually-typed timestamp string into seconds.
 * Accepts: "12:43", "1:12:43", "90" (seconds), "1h24m30s"
 * Returns null if unparseable or zero.
 */
export function parseManualTimestamp(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  // Pure integer (seconds)
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n > 0 ? n : null;
  }
  // Colon-separated: MM:SS or H:MM:SS
  if (/^[\d:]+$/.test(s)) return parseColonTime(s);
  // YouTube-style: 1h24m30s
  const m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (m && s !== "") {
    const total = (parseInt(m[1] ?? "0", 10)) * 3600
                + (parseInt(m[2] ?? "0", 10)) * 60
                + (parseInt(m[3] ?? "0", 10));
    return total > 0 ? total : null;
  }
  return null;
}

/**
 * Extracts a timestamp (in seconds) from a YouTube or SoundCloud URL.
 *
 * YouTube:    ?t=5070 | ?t=1h24m30s | ?t=84m30s | ?t=30s
 * SoundCloud: #t=1:24:30 | #t=84:30
 */
export function extractTimestampFromUrl(url: string): number | null {
  try {
    const parsed = new URL(url);

    // YouTube — ?t= query param
    const t = parsed.searchParams.get("t");
    if (t) return parseYouTubeTime(t);

    // SoundCloud — #t= hash fragment
    if (parsed.hash.startsWith("#t=")) {
      return parseColonTime(parsed.hash.slice(3));
    }
  } catch {
    // Invalid URL — ignore
  }
  return null;
}

function parseYouTubeTime(t: string): number | null {
  // Pure integer seconds: "5070"
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return n > 0 ? n : null;
  }
  // Human format: "1h24m30s", "84m30s", "30s", "1h", "1h30s" …
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || t === "") return null;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const s = parseInt(m[3] ?? "0", 10);
  const total = h * 3600 + min * 60 + s;
  return total > 0 ? total : null;
}

function parseColonTime(t: string): number | null {
  // "H:MM:SS" | "MM:SS" | "SS"
  const parts = t.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

/**
 * Formats seconds into a human-readable timestamp string.
 * 5070 → "1:24:30"   |   90 → "1:30"   |   45 → "0:45"
 */
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Returns the source URL modified to start playback at the given timestamp.
 * YouTube:    adds/replaces ?t= param
 * SoundCloud: adds/replaces #t= hash
 * Others:     returns the URL unchanged
 */
export function buildTimestampUrl(sourceUrl: string, timestamp: number | null): string {
  if (!timestamp || timestamp <= 0) return sourceUrl;
  try {
    const parsed = new URL(sourceUrl);
    if (/youtube\.com|youtu\.be/.test(parsed.hostname)) {
      parsed.searchParams.set("t", String(timestamp));
      return parsed.toString();
    }
    if (/soundcloud\.com/.test(parsed.hostname)) {
      parsed.hash = `t=${formatTimestamp(timestamp)}`;
      return parsed.toString();
    }
  } catch {
    // Invalid URL
  }
  return sourceUrl;
}
