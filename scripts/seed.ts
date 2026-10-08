// Seeds the feed with starter posts: public-domain / CC0 NYC photos from
// Wikimedia Commons, captioned by the same code users run (src/lib/captioner).
// Posts belong to a "Caption the City" house account so they don't count
// against anyone's daily limit. Votes are NOT seeded; scores start at 0.
//
// Run: npx tsx --conditions=react-server scripts/seed.ts
// (react-server condition lets the "server-only" import in captioner load.)

import { createClient } from "@supabase/supabase-js";
import { CAPTION_MODEL, CAPTION_PROMPT, captionImage } from "../src/lib/captioner";

process.loadEnvFile(".env.local");

const HOUSE_EMAIL = "house@caption-the-city.invalid";
const USER_AGENT = "CaptionTheCity-seed/1.0 (class project; ravinc2016@gmail.com)";
const MAX_BYTES = 4 * 1024 * 1024;

const PHOTOS = [
  "Low Memorial Library - Columbia University.jpg",
  "Butler Library (Columbia University).jpg",
  "Hartley Hall at Columbia University.jpg",
  "Train stopping at a New York subway station (Unsplash).jpg",
  "Washington Square Arch, New York.jpg",
  "Yellow Cabs in NYC (Unsplash).jpg",
  "Steam in new york street (Unsplash).jpg",
  "Apartment windows in new york (Unsplash).jpg",
  "Snowy Times Square (Unsplash).jpg",
  "Central Park Mall during Stella Snowstorm (Unsplash).jpg",
  "My favorite view from the Brooklyn Bridge (Unsplash).jpg",
  "Manhattan through Dumbo (Unsplash).jpg",
  "City Bike Rentals (Unsplash).jpg",
  "Trays of Baked Goods (Unsplash).jpg",
  "Busy New York City restaurant (Unsplash).jpg",
  "NYC rain (Unsplash).jpg",
  "Pennsylvania Station, New York, United States (Unsplash).jpg",
  "Manhattanhenge on Times Square (Unsplash).jpg",
];

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function houseAccountId() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email === HOUSE_EMAIL);
  if (existing) return existing.id;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: HOUSE_EMAIL,
    email_confirm: true, // no password: nobody can sign in as this account
  });
  if (createError) throw createError;
  await admin
    .from("profiles")
    .update({ first_name: "Caption", last_name: "the City" })
    .eq("id", created.user.id);
  return created.user.id;
}

// Looks the file up on Commons and refuses anything not public domain / CC0.
async function fetchPhoto(title: string) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query",
    format: "json",
    titles: `File:${title}`,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "1280",
    iiextmetadatafilter: "LicenseShortName",
  }).toString();
  const res = await fetch(api, { headers: { "User-Agent": USER_AGENT } });
  const page = Object.values((await res.json()).query.pages)[0] as {
    imageinfo?: { thumburl: string; mime: string; extmetadata?: { LicenseShortName?: { value: string } } }[];
  };
  const info = page.imageinfo?.[0];
  if (!info) throw new Error("not found on Commons");
  const license = info.extmetadata?.LicenseShortName?.value ?? "";
  if (!/^(public domain|cc0)/i.test(license)) throw new Error(`license is "${license}"`);
  if (info.mime !== "image/jpeg") throw new Error(`unexpected type ${info.mime}`);

  const img = await fetch(info.thumburl, { headers: { "User-Agent": USER_AGENT } });
  if (!img.ok) throw new Error(`download failed (${img.status})`);
  const bytes = Buffer.from(await img.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error("image over 4 MB");
  return bytes;
}

async function main() {
  const userId = await houseAccountId();
  const { count } = await admin
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) > 0 && !process.argv.includes("--force")) {
    console.log(`House account already has ${count} posts. Re-run with --force to add more.`);
    return;
  }

  for (const title of PHOTOS) {
    try {
      const bytes = await fetchPhoto(title);
      const captions = await captionImage(bytes.toString("base64"), "image/jpeg");

      const path = `${userId}/${Date.now()}.jpg`;
      const { error: uploadError } = await admin.storage
        .from("photos")
        .upload(path, bytes, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: image, error: imageError } = await admin
        .from("images")
        .insert({ user_id: userId, storage_path: path })
        .select("id")
        .single();
      if (imageError) throw imageError;

      const { error: captionsError } = await admin.from("captions").insert(
        captions.map((body) => ({ image_id: image.id, body, prompt: CAPTION_PROMPT, model: CAPTION_MODEL })),
      );
      if (captionsError) throw captionsError;

      console.log(`✓ ${title}`);
      captions.forEach((c) => console.log(`    ${c}`));
    } catch (e) {
      console.log(`✗ ${title}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
