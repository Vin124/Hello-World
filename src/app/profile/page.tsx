import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { updateName } from "./actions";
import { NameFields } from "./name-fields";
import { AvatarUpload } from "./avatar-upload";

export default async function ProfilePage({
  searchParams,
}: PageProps<"/profile">) {
  const { error } = await searchParams;
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12 font-sans">
      <Link href="/members" className="text-sm text-zinc-500 hover:underline">
        ← Members
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Profile
      </h1>
      <p className="mt-1 text-sm text-zinc-500">{user.email}</p>

      <section className="mt-8">
        <AvatarUpload
          userId={user.id}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </section>

      <form action={updateName} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="return_to" value="/profile" />
        <input type="hidden" name="next" value="/profile" />
        <NameFields
          firstName={profile?.first_name ?? ""}
          lastName={profile?.last_name ?? ""}
          error={typeof error === "string" ? error : undefined}
          submitLabel="Save"
        />
      </form>
    </main>
  );
}
