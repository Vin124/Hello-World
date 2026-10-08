import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const CAPTION_MODEL = "claude-haiku-5-5";

// Saved verbatim with every caption so we know exactly what produced it.
export const CAPTION_PROMPT = `You write captions for a photo-sharing site used by college students in New York City.
The audience: a Columbia junior who is chronically online, grew up in the Midwest, is still new to NYC, lives in the dorms, and explores the city on weekends.

Look at the photo and write 3 different captions for it:
1. A relatable, self-aware one (the "new to the city" or "dorm life" angle).
2. One in current internet-humor style (deadpan, meme-adjacent, lowercase is fine).
3. One that names a specific, real NYC detail you can actually see, or a wry guess about where it was taken.

Rules: each caption is under 120 characters, no hashtags, no emojis at the start, nothing mean about people in the photo, nothing sexual. If the photo is not appropriate to caption, return captions that politely decline.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    captions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["captions"],
  additionalProperties: false,
};

export type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export async function captionImage(base64: string, mediaType: ImageMediaType) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const message = await client.messages.create({
    model: CAPTION_MODEL,
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: CAPTION_PROMPT },
        ],
      },
    ],
  });

  const text = message.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("The AI returned no captions.");

  const parsed = JSON.parse(text) as { captions?: unknown };
  const captions = Array.isArray(parsed.captions)
    ? parsed.captions
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.length <= 300)
        .slice(0, 3)
    : [];
  if (captions.length === 0) throw new Error("The AI returned no usable captions.");
  return captions;
}
