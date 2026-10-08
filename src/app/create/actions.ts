"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CAPTION_MODEL,
  CAPTION_PROMPT,
  captionImage,
  type ImageMediaType,
} from "@/lib/captioner";

const DAILY_LIMIT = 10;
const MAX_BYTES = 4 * 1024 * 1024;
const MEDIA_TYPES: Record<string, ImageMediaType> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

// The browser uploads the photo to Storage (into the user's own folder, per
// the storage policy), then calls this with the path. We re-derive identity
// from the session, check the path belongs to the caller, caption the photo,
// and save the image + captions with the service role (clients can't).
export async function generateCaptions(
  storagePath: string,
): Promise<{ error: string } | { imageId: string }> {
  const { user } = await getUser();
  if (!user) return { error: "Please sign in to generate captions." };

  const match = /^([0-9a-f-]{36})\/\d{1,16}\.(png|jpe?g|gif|webp)$/.exec(storagePath);
  if (!match || match[1] !== user.id) return { error: "Invalid upload." };
  const mediaType = MEDIA_TYPES[match[2]];

  const admin = createAdminClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) return { error: countError.message };
  if ((count ?? 0) >= DAILY_LIMIT) {
    return { error: `You've hit the limit of ${DAILY_LIMIT} photos per day. Come back tomorrow!` };
  }

  const { data: file, error: downloadError } = await admin.storage
    .from("photos")
    .download(storagePath);
  if (downloadError || !file) return { error: "Couldn't read the uploaded photo." };
  if (file.size > MAX_BYTES) return { error: "Photo must be 4 MB or smaller." };

  let captions: string[];
  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    captions = await captionImage(base64, mediaType);
  } catch (e) {
    console.error("captionImage failed", e);
    return { error: "The AI couldn't caption that photo. Try another one." };
  }

  const { data: image, error: imageError } = await admin
    .from("images")
    .insert({ user_id: user.id, storage_path: storagePath })
    .select("id")
    .single();
  if (imageError || !image) return { error: "Couldn't save your photo. Try again." };

  const { error: captionsError } = await admin.from("captions").insert(
    captions.map((body) => ({
      image_id: image.id,
      body,
      prompt: CAPTION_PROMPT,
      model: CAPTION_MODEL,
    })),
  );
  if (captionsError) {
    await admin.from("images").delete().eq("id", image.id);
    return { error: "Couldn't save the captions. Try again." };
  }

  revalidatePath("/");
  return { imageId: image.id };
}
