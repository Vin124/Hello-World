import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export async function SiteHeader() {
  const { user } = await getUser();

  return (
    <header className="sticky top-0 z-30 px-4 pt-4">
      <nav className="clay-sm mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 backdrop-blur [--clay-bg:color-mix(in_srgb,var(--surface)_85%,transparent)]">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight text-ink">
          <span className="clay-sm tint-apricot grid h-8 w-8 place-items-center text-base" aria-hidden>
            🗽
          </span>
          <span className="hidden sm:inline">Caption the City</span>
        </Link>
        <div className="flex items-center gap-2 text-sm font-bold sm:gap-3">
          <Link href="/feed" className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-ink">
            Feed
          </Link>
          {user ? (
            <>
              <Link href="/profile" className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-ink">
                Profile
              </Link>
              <form action={signOut} className="hidden sm:block">
                <button type="submit" className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-ink">
                  Sign out
                </button>
              </form>
              <Link href="/create" className="btn btn-primary btn-sm">
                Post
              </Link>
            </>
          ) : (
            <Link href="/login?next=/feed" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
