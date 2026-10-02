import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { updateName } from "@/app/profile/actions";
import { NameFields } from "@/app/profile/name-fields";

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const { next, error } = await searchParams;
  const nextPath = safeNext(typeof next === "string" ? next : undefined);

  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();
  if (profile?.first_name && profile?.last_name) redirect(nextPath);

  // Pre-fill from the Google account as a suggestion; the user confirms it.
  const [googleFirst = "", ...rest] = String(
    user.user_metadata.full_name ?? "",
  ).split(" ");

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Welcome!
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Before you continue, tell us your name.
      </p>
      <form action={updateName} className="mt-6 flex flex-col gap-4">
        <input
          type="hidden"
          name="return_to"
          value={`/onboarding?next=${encodeURIComponent(nextPath)}`}
        />
        <input type="hidden" name="next" value={nextPath} />
        <NameFields
          firstName={profile?.first_name ?? googleFirst}
          lastName={profile?.last_name ?? rest.join(" ")}
          error={typeof error === "string" ? error : undefined}
          submitLabel="Continue"
        />
      </form>
    </main>
  );
}
