import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { updateName } from "./actions";
import { NameFields } from "./name-fields";
import { AvatarUpload } from "./avatar-upload";
import { signOut } from "@/app/auth/actions";

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
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-10">
      <div className="clay rise p-7 sm:p-9">
      <Link href="/feed" className="text-sm font-bold text-muted hover:text-ink">
        ← Feed
      </Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">
        Profile
      </h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

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
      <form action={signOut} className="mt-6 border-t border-muted/20 pt-6">
        <button type="submit" className="btn w-full">
          Sign out
        </button>
      </form>
      </div>
    </main>
  );
}
