"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

const MAX_NAME = 50;

// Shared by onboarding and the profile page. RLS limits the update to the
// caller's own row; the .eq() just targets it.
export async function updateName(formData: FormData) {
  const firstName = formData.get("first_name")?.toString().trim() ?? "";
  const lastName = formData.get("last_name")?.toString().trim() ?? "";
  const returnTo = safeNext(formData.get("return_to")?.toString(), "/profile");
  const next = safeNext(formData.get("next")?.toString(), returnTo);

  const fail = (msg: string) =>
    redirect(
      `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`,
    );

  if (!firstName || !lastName) fail("First and last name are required.");
  if (firstName.length > MAX_NAME || lastName.length > MAX_NAME) {
    fail(`Names must be ${MAX_NAME} characters or fewer.`);
  }

  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) fail(error.message);

  revalidatePath("/", "layout");
  redirect(next);
}
