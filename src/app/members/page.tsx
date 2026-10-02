import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

// Members-only route: the proxy redirects logged-out visitors, and this
// page re-checks with getUser() so it never relies on the proxy alone.
export default async function MembersPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/members");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();
  if (!profile?.first_name || !profile?.last_name) {
    redirect("/onboarding?next=/members");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 font-sans">
      <div className="flex items-center gap-4">
        {profile.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Welcome, {profile.first_name}
        </h1>
      </div>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        This page is only visible to signed-in members.
      </p>
      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/profile" className="text-zinc-500 hover:underline">
          Edit profile
        </Link>
        <Link href="/books" className="text-zinc-500 hover:underline">
          Books
        </Link>
        <form action={signOut}>
          <button type="submit" className="text-zinc-500 hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
