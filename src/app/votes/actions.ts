"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Casts, switches, or (clicking the same arrow again) removes the caller's
// vote. Runs with the user's own session, so RLS also limits it to their rows.
export async function vote(captionId: string, value: 1 | -1) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/feed");
  if (!UUID.test(captionId) || (value !== 1 && value !== -1)) return;

  const { data: existing, error: readError } = await supabase
    .from("votes")
    .select("id, value")
    .eq("caption_id", captionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const { error } = !existing
    ? await supabase.from("votes").insert({ caption_id: captionId, user_id: user.id, value })
    : existing.value === value
      ? await supabase.from("votes").delete().eq("id", existing.id)
      : await supabase.from("votes").update({ value }).eq("id", existing.id);
  if (error) throw new Error(error.message);

  revalidatePath("/feed");
  revalidatePath("/");
}
