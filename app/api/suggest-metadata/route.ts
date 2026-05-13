import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/* ─── System prompt ──────────────────────────────────────────────────────── */

const SYSTEM = `You are a music metadata extractor for DJs and diggers. Extract structured metadata from the provided text about a music track.

Rules:
- Extract only information explicitly present in the text. Never invent or assume.
- artist: performing artist or producer name.
- title: track or song title.
- genre: musical genre, max 2 words (e.g. "Ambient Techno", "Deep House").
- mood: emotional feel, max 2 words (e.g. "Dark Melancholic", "Euphoric").
- summary: 1 short sentence describing the music style or context.
- confidence: 0.0–1.0. Use 0.8+ only if both artist and title are clearly extractable from the text. Use 0.5–0.7 for partial extractions. Use below 0.4 if mostly guessing from context only.
- Return "" for any field that cannot be determined from the provided text.

Return only valid JSON with no markdown fences, no explanation:
{"artist":"","title":"","genre":"","mood":"","summary":"","confidence":0.0}`;

/* ─── Input type ─────────────────────────────────────────────────────────── */

type SuggestInput = {
  platform?:    string;
  title?:       string;
  artist?:      string;
  description?: string;
  caption?:     string;
  author?:      string;
  url?:         string;
  notes?:       string;
};

/* ─── Build prompt from input fields ─────────────────────────────────────── */

function buildPrompt(input: SuggestInput): string {
  const lines: string[] = [];
  if (input.platform)    lines.push(`Platform: ${input.platform}`);
  if (input.url)         lines.push(`URL: ${input.url}`);
  if (input.title)       lines.push(`Title: ${input.title}`);
  if (input.artist)      lines.push(`Artist: ${input.artist}`);
  if (input.author)      lines.push(`Author/Channel: ${input.author}`);
  if (input.description) lines.push(`Description: ${input.description}`);
  if (input.caption)     lines.push(`Caption: ${input.caption}`);
  if (input.notes)       lines.push(`Notes: ${input.notes}`);
  return lines.join("\n");
}

/* ─── POST handler ───────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  /* Graceful fallback if key is not configured */
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI unavailable" });
  }

  /* Parse body */
  let input: SuggestInput;
  try {
    input = (await req.json()) as SuggestInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const prompt = buildPrompt(input);
  if (!prompt.trim()) {
    return NextResponse.json({ error: "No input provided" }, { status: 400 });
  }

  /* Call Anthropic */
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system:     SYSTEM,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw     = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");

    /* Parse JSON */
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    /* Validate and return */
    return NextResponse.json({
      artist:     typeof parsed.artist     === "string" ? parsed.artist     : "",
      title:      typeof parsed.title      === "string" ? parsed.title      : "",
      genre:      typeof parsed.genre      === "string" ? parsed.genre      : "",
      mood:       typeof parsed.mood       === "string" ? parsed.mood       : "",
      summary:    typeof parsed.summary    === "string" ? parsed.summary    : "",
      confidence: typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `AI request failed: ${msg}` }, { status: 500 });
  }
}
