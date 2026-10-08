import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { VoteButtons } from "./vote-buttons";

type Caption = { id: string; body: string; score: number };
type Image = {
  id: string;
  storage_path: string;
  created_at: string;
  captions: Caption[];
};

const TINTS = ["tint-rose", "tint-peach", "tint-sage", "tint-sand", "tint-blush", "tint-apricot"];
const best = (img: Image) => Math.max(0, ...img.captions.map((c) => c.score));
const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-8">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">The Feed</h1>
          <p className="mt-1 text-muted">AI writes the captions. You pick the winners.</p>
        </div>
        <div className="clay-inset flex p-1 text-sm font-bold" role="tablist" aria-label="Sort">
          {(["top", "new"] as const).map((s) => (
            <Link
              key={s}
              href={s === "top" ? "/feed" : "/feed?sort=new"}
              role="tab"
              aria-selected={sort === s}
              className={`rounded-xl px-4 py-1.5 capitalize transition-all duration-300 ${sort === s ? "clay-sm text-ink" : "text-muted hover:text-ink"}`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {top && (
        <a
          href={`#${top.images.id}`}
          className="clay tint-apricot lift rise mt-8 flex items-center gap-4 p-4 [--i:1]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(top.images.storage_path)}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
          />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              🏆 Caption of the day · {top.score} {top.score === 1 ? "vote" : "votes"}
            </p>
            <p className="mt-1 font-bold">{top.body}</p>
          </div>
        </a>
      )}

      {feed.length === 0 ? (
        <div className="clay rise mt-10 p-10 text-center [--i:2]">
          <p className="text-muted">No photos yet.</p>
          <Link href="/create" className="btn btn-primary mt-4">
            Post the first one
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-10">
          {feed.map((img, i) => (
            <li
              key={img.id}
              id={img.id}
              className={`clay reveal scroll-mt-28 p-3 ${TINTS[i % TINTS.length]}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(img.storage_path)}
                alt=""
                loading="lazy"
                className="w-full rounded-[1.5rem] bg-surface object-cover"
              />
              <ul className="mt-3 space-y-2">
                {img.captions.map((c, rank) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface/70 p-2 pr-4">
                    {user ? (
                      <VoteButtons
                        captionId={c.id}
                        score={c.score}
                        myVote={myVotes.get(c.id) ?? 0}
                      />
                    ) : (
                      <span className="w-10 text-center text-sm font-black tabular-nums">
                        {c.score}
                      </span>
                    )}
                    <p className={rank === 0 && c.score > 0 ? "font-bold" : ""}>{c.body}</p>
                  </li>
                ))}
              </ul>
              {!user && (
                <Link
                  href="/login?next=/feed"
                  className="mt-2 inline-block px-2 py-1 text-sm font-bold text-muted hover:text-ink"
                >
                  Sign in to vote →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
