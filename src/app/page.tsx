import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

type Showcase = {
  id: string;
  storage_path: string;
  captions: { body: string; score: number }[];
};

const HERO_CARDS = [
  { tint: "tint-peach", pos: "left-0 top-0 w-40 sm:w-60", r: "-5deg" },
  { tint: "tint-sage", pos: "right-0 top-16 w-40 sm:w-56", r: "4deg" },
  { tint: "tint-sand", pos: "left-[12%] top-[13rem] w-40 sm:top-[17rem] sm:w-60", r: "-2deg" },
];

const STEPS = [
  {
    emoji: "📸",
    tint: "tint-rose",
    title: "Snap the city",
    body: "Bodega cat, dorm view, that one subway moment. Upload it in two taps.",
  },
  {
    emoji: "✨",
    tint: "tint-peach",
    title: "AI writes three captions",
    body: "One relatable, one unhinged, one that actually knows the block.",
  },
  {
    emoji: "🗳️",
    tint: "tint-sage",
    title: "Everyone votes",
    body: "Upvote the funniest. The top caption each day becomes Caption of the Day.",
  },
];

export default async function LandingPage() {
  const { supabase, user } = await getUser();
  // Signed-in users came to vote; the landing page is for newcomers.
  if (user) redirect("/feed");

  const [{ data: showcase }, { count: photoCount }, { count: captionCount }] =
    await Promise.all([
      supabase
        .from("images")
        .select("id, storage_path, captions(body, score)")
        .order("created_at", { ascending: false })
        .limit(3)
        .returns<Showcase[]>(),
      supabase.from("images").select("id", { count: "exact", head: true }),
      supabase.from("captions").select("id", { count: "exact", head: true }),
    ]);

  const photoUrl = (path: string) =>
    supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
  const topCaption = (s: Showcase) =>
    [...s.captions].sort((a, b) => b.score - a.score)[0]?.body ?? "";

  const primaryCta = user
    ? { href: "/create", label: "Post a photo" }
    : { href: "/login?next=/create", label: "Sign in with Google" };

  return (
    <main className="relative flex-1 overflow-hidden">
      <div aria-hidden className="blob -left-24 top-10 h-80 w-80 bg-rose" />
      <div aria-hidden className="blob -right-20 top-64 h-96 w-96 bg-peach [animation-delay:-6s]" />
      <div aria-hidden className="blob left-1/3 top-[42rem] h-80 w-80 bg-sage [animation-delay:-12s]" />

      {/* Hero */}
      <section className="relative mx-auto grid max-w-5xl items-center gap-12 px-4 pb-20 pt-12 md:grid-cols-2 md:pt-20">
        <div>
          <p className="clay-sm tint-apricot rise inline-block px-4 py-1.5 text-xs font-black uppercase tracking-widest">
            Made for Columbia · NYC
          </p>
          <h1 className="rise mt-6 text-5xl font-black leading-[1.02] tracking-tight [--i:1] sm:text-6xl">
            New York,
            <br />
            <span className="bg-gradient-to-r from-accent via-up to-[#b8432c] bg-clip-text text-transparent">
              captioned by AI.
            </span>
            <br />
            Ranked by you.
          </h1>
          <p className="rise mt-6 max-w-md text-lg text-muted [--i:2]">
            Post a photo from your week in the city. AI writes three captions,
            and everyone votes on the best one. New winner every day.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-4 [--i:3]">
            <Link href={primaryCta.href} className="btn btn-primary">
              {primaryCta.label}
            </Link>
            <Link href="/feed" className="btn">
              Browse the feed →
            </Link>
          </div>
          <p className="rise mt-6 text-sm font-bold text-muted [--i:4]">
            {photoCount ?? 0} photos · {captionCount ?? 0} AI captions and counting
          </p>
        </div>

        <div className="relative h-[25rem] sm:h-[33rem]" aria-hidden>
          {(showcase ?? []).slice(0, 3).map((s, i) => (
            <Link
              key={s.id}
              href={`/feed?sort=new#${s.id}`}
              tabIndex={-1}
              className={`absolute ${HERO_CARDS[i].pos}`}
            >
              <div
                className={`clay ${HERO_CARDS[i].tint} float p-2.5 transition-transform duration-500 ease-[var(--spring)] hover:scale-105`}
                style={{ "--i": i, "--r": HERO_CARDS[i].r } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(s.storage_path)}
                  alt=""
                  className="aspect-[4/3] w-full rounded-[1.4rem] object-cover"
                />
                <p className="line-clamp-2 px-2 pb-1 pt-2 text-sm font-bold">
                  {topCaption(s)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-5xl px-4 py-16">
        <h2 className="reveal text-center text-3xl font-black tracking-tight sm:text-4xl">
          How it works
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className={`clay ${step.tint} lift reveal p-7`}>
              <span className="clay-sm grid h-14 w-14 place-items-center text-2xl" aria-hidden>
                {step.emoji}
              </span>
              <p className="mt-5 text-xs font-black uppercase tracking-widest text-muted">
                Step {i + 1}
              </p>
              <h3 className="mt-1 text-xl font-black">{step.title}</h3>
              <p className="mt-2 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="relative mx-auto max-w-5xl px-4 pb-24 pt-8">
        <div className="clay tint-rose reveal px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Your camera roll is funnier than you think.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Ten photos a day, three captions each. See if yours makes Caption of the Day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href={primaryCta.href} className="btn btn-primary">
              {primaryCta.label}
            </Link>
            <Link href="/feed" className="btn">
              Browse the feed
            </Link>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-muted">
          Starter photos are public domain / CC0 via Wikimedia Commons. Captions by Claude.
        </p>
      </section>
    </main>
  );
}
