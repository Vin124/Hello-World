import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VoteButtons } from "./vote-buttons";

type Caption = { id: string; body: string; score: number };
type Image = {
  id: string;
  user_id: string;
  storage_path: string;
  created_at: string;
  captions: Caption[];
};

const TINTS = ["tint-rose", "tint-peach", "tint-sage", "tint-sand", "tint-blush", "tint-apricot"];
const best = (img: Image) => Math.max(0, ...img.captions.map((c) => c.score));
const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

type Sort = "top" | "new" | "unvoted";
const SORT_HREF: Record<Sort, string> = {
  top: "/feed?sort=top",
  new: "/feed?sort=new",
  unvoted: "/feed?sort=unvoted",
};

// Profiles are private under RLS (own row only), so the uploader's name and
// avatar are read with the service role and only those fields leave
// the server. A failure here just hides the byline instead of breaking the feed.
async function uploaders(ids: string[]) {
  const byId = new Map<string, { name: string; avatar: string | null }>();
  if (ids.length === 0) return byId;
  try {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .in("id", ids);
    for (const p of data ?? []) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      byId.set(p.id, { name: name || "A classmate", avatar: p.avatar_url });
    }
  } catch (e) {
    console.error("Failed to load uploaders", e);
  }
  return byId;
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const { supabase, user } = await getUser();
  const requested = (await searchParams).sort;
  // Signed-in users land on the voting queue; everyone else on the top photos.
  const sort: Sort =
    requested === "new" || requested === "top"
      ? requested
      : user && (requested === "unvoted" || requested === undefined)
        ? "unvoted"
        : "top";
  const since = dayAgo();

  const [{ data: images, error }, { data: top }, { data: votes }] = await Promise.all([
    supabase
      .from("images")
      .select("id, user_id, storage_path, created_at, captions(id, body, score)")
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

  const byUploader = await uploaders([...new Set(images.map((img) => img.user_id))]);

  const all = images.map((img) => ({
    ...img,
    captions: [...img.captions].sort((a, b) => b.score - a.score),
  }));
  // "To vote" = other people's photos where the viewer hasn't voted on any caption yet.
  const isUnvoted = (img: Image) =>
    img.user_id !== user?.id && !img.captions.some((c) => myVotes.has(c.id));
  const unvotedCount = all.filter(isUnvoted).length;
  const feed = sort === "unvoted" ? all.filter(isUnvoted) : all;
  if (sort === "top") feed.sort((a, b) => best(b) - best(a));
  const tabs: Sort[] = user ? ["unvoted", "top", "new"] : ["top", "new"];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            {sort === "unvoted" ? "Pick the funniest" : "The Feed"}
          </h1>
          <p className="mt-1 text-muted">
            {sort === "unvoted"
              ? "AI wrote three captions for each classmate's photo. Upvote the one that got you."
              : "AI writes the captions. You pick the winners."}
          </p>
        </div>
        <div className="clay-inset flex p-1 text-sm font-bold" role="tablist" aria-label="Sort">
          {tabs.map((s) => (
            <Link
              key={s}
              href={SORT_HREF[s]}
              role="tab"
              aria-selected={sort === s}
              className={`rounded-xl px-4 py-1.5 capitalize transition-all duration-300 ${sort === s ? "clay-sm text-ink" : "text-muted hover:text-ink"}`}
            >
              {s === "unvoted" ? `To vote${unvotedCount ? ` · ${unvotedCount}` : ""}` : s}
            </Link>
          ))}
        </div>
      </div>

      {top && (
        <a
          href={`/feed?sort=top#${top.images.id}`}
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

      {feed.length === 0 && sort === "unvoted" ? (
        <div className="clay tint-sage rise mt-10 p-10 text-center [--i:2]">
          <p className="text-4xl" aria-hidden>🎉</p>
          <p className="mt-3 text-xl font-black">You&apos;re all caught up</p>
          <p className="mt-1 text-muted">
            You&apos;ve voted on every classmate&apos;s photo. New ones land here as people post.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/create" className="btn btn-primary">
              Post a photo
            </Link>
            <Link href="/feed?sort=top" className="btn">
              See what&apos;s winning
            </Link>
          </div>
        </div>
      ) : feed.length === 0 ? (
        <div className="clay rise mt-10 p-10 text-center [--i:2]">
          <p className="text-muted">No photos yet.</p>
          <Link href="/create" className="btn btn-primary mt-4">
            Post the first one
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-10">
          {feed.map((img, i) => {
            const uploader = byUploader.get(img.user_id);
            return (
            <li
              key={img.id}
              id={img.id}
              className={`clay reveal grid scroll-mt-28 gap-4 p-3 sm:p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:gap-6 ${TINTS[i % TINTS.length]}`}
            >
              {/* Photo and captions sit side by side from md up; on phones the
                  photo is height-capped so the captions stay on screen with it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(img.storage_path)}
                alt=""
                loading="lazy"
                className="max-h-[36vh] w-full rounded-[1.5rem] bg-surface object-cover md:aspect-[4/5] md:max-h-[34rem]"
              />
              <div className="flex min-w-0 flex-col gap-3 md:py-2 md:pr-2">
              <div className="flex items-center gap-2 px-1 text-sm">
                {uploader?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploader.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="clay-sm grid h-8 w-8 place-items-center text-xs" aria-hidden>
                    📷
                  </span>
                )}
                <span className="font-bold">
                  {user?.id === img.user_id ? "You" : (uploader?.name ?? "A classmate")}
                </span>
                <span className="text-muted">· {timeAgo(img.created_at)}</span>
              </div>
              <ul className="space-y-2.5">
                {img.captions.map((c, rank) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface/80 p-2 pr-4 text-[0.95rem] leading-snug md:text-[1.05rem]">
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
                  className="inline-block px-1 text-sm font-bold text-muted hover:text-ink"
                >
                  Sign in to vote →
                </Link>
              )}
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
