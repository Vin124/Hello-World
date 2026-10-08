import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { VoteButtons } from "./vote-buttons";

type Caption = { id: string; body: string; score: number };
type Image = {
  id: string;
  storage_path: string;
  created_at: string;
  captions: Caption[];
};

const best = (img: Image) => Math.max(0, ...img.captions.map((c) => c.score));
const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

export default async function Home({ searchParams }: PageProps<"/">) {
  const sort = (await searchParams).sort === "new" ? "new" : "top";
  const { supabase, user } = await getUser();
  const since = dayAgo();

  const [{ data: images, error }, { data: top }, { data: votes }] = await Promise.all([
    supabase
      .from("images")
      .select("id, storage_path, created_at, captions(id, body, score)")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Image[]>(),
    supabase
      .from("captions")
      .select("id, body, score, images(id, storage_path)")
      .gte("created_at", since)
      .gt("score", 0)
      .order("score", { ascending: false })
      .limit(1)
      .returns<(Caption & { images: { id: string; storage_path: string } })[]>()
      .maybeSingle(),
    user
      ? supabase.from("votes").select("caption_id, value")
      : Promise.resolve({ data: [] as { caption_id: string; value: number }[] }),
  ]);
  if (error) throw new Error(`Failed to load the feed: ${error.message}`);

  const myVotes = new Map((votes ?? []).map((v) => [v.caption_id, v.value as 1 | -1]));
  const photoUrl = (path: string) =>
    supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;

  const feed = images.map((img) => ({
    ...img,
    captions: [...img.captions].sort((a, b) => b.score - a.score),
  }));
  if (sort === "top") feed.sort((a, b) => best(b) - best(a));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 font-sans">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Caption the City
        </h1>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link
                href="/create"
                className="rounded-full bg-black px-4 py-1.5 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black"
              >
                Post a photo
              </Link>
              <Link href="/profile" className="text-zinc-500 hover:underline">
                Profile
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-zinc-500 hover:underline">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login?next=/"
              className="rounded-full bg-black px-4 py-1.5 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black"
            >
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        New York through students&apos; camera rolls. AI writes the captions, you
        pick the winners.
      </p>

      {top && (
        <a
          href={`#${top.images.id}`}
          className="mt-6 flex items-center gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(top.images.storage_path)}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Caption of the day · {top.score} {top.score === 1 ? "vote" : "votes"}
            </p>
            <p className="mt-1 font-medium text-black dark:text-zinc-50">{top.body}</p>
          </div>
        </a>
      )}

      <div className="mt-6 flex gap-4 border-b border-zinc-200 text-sm dark:border-zinc-800">
        {(["top", "new"] as const).map((s) => (
          <Link
            key={s}
            href={s === "top" ? "/" : "/?sort=new"}
            className={`-mb-px border-b-2 pb-2 capitalize ${sort === s ? "border-black font-medium text-black dark:border-zinc-50 dark:text-zinc-50" : "border-transparent text-zinc-500"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      {feed.length === 0 ? (
        <p className="mt-12 text-center text-zinc-500">
          No photos yet.{" "}
          <Link href="/create" className="underline">
            Post the first one.
          </Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-10">
          {feed.map((img) => (
            <li key={img.id} id={img.id} className="scroll-mt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(img.storage_path)}
                alt=""
                loading="lazy"
                className="w-full rounded-xl bg-zinc-100 object-cover dark:bg-zinc-900"
              />
              <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {img.captions.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2">
                    {user ? (
                      <VoteButtons
                        captionId={c.id}
                        score={c.score}
                        myVote={myVotes.get(c.id) ?? 0}
                      />
                    ) : (
                      <span className="w-8 text-center text-sm font-medium tabular-nums text-black dark:text-zinc-50">
                        {c.score}
                      </span>
                    )}
                    <p className="text-black dark:text-zinc-50">{c.body}</p>
                  </li>
                ))}
              </ul>
              {!user && (
                <Link
                  href="/login?next=/"
                  className="mt-1 inline-block text-sm text-zinc-500 hover:underline"
                >
                  Sign in to vote
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
