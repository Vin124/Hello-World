import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { updateName } from "./actions";
import { NameFields } from "./name-fields";
import { AvatarUpload } from "./avatar-upload";
import { signOut } from "@/app/auth/actions";

type MyPhoto = {
  id: string;
  storage_path: string;
  captions: { body: string; score: number }[];
};

export default async function ProfilePage({
  searchParams,
}: PageProps<"/profile">) {
  const { error } = await searchParams;
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/profile");

  const [{ data: profile }, { data: photos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("images")
      .select("id, storage_path, captions(body, score)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<MyPhoto[]>(),
  ]);

  const photoUrl = (path: string) =>
    supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
  const mine = (photos ?? []).map((p) => {
    const winner = [...p.captions].sort((a, b) => b.score - a.score)[0];
    return { ...p, winner };
  });
  const totalScore = mine.reduce((sum, p) => sum + Math.max(0, p.winner?.score ?? 0), 0);

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

      <section className="clay rise mt-8 p-7 [--i:1] sm:p-9" aria-labelledby="my-photos">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="my-photos" className="text-2xl font-black tracking-tight">
            My photos
          </h2>
          {mine.length > 0 && (
            <p className="text-sm font-bold text-muted">
              {mine.length} posted · {totalScore} {totalScore === 1 ? "vote" : "votes"} on winners
            </p>
          )}
        </div>
        {mine.length === 0 ? (
          <div className="mt-6 text-center">
            <p className="text-muted">
              Post a photo and AI writes three captions. Check back here to see which one the class
              picked.
            </p>
            <Link href="/create" className="btn btn-primary mt-5">
              Post your first photo
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {mine.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/feed?sort=new#${p.id}`}
                  className="lift flex items-center gap-4 rounded-2xl bg-surface/70 p-2 pr-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl(p.storage_path)}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-muted">
                      {p.winner && p.winner.score > 0
                        ? `Winning · ${p.winner.score} ${p.winner.score === 1 ? "vote" : "votes"}`
                        : "No votes yet"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-bold">{p.winner?.body}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
