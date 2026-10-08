import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { signInWithGoogle } from "@/app/auth/actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = safeNext(typeof next === "string" ? next : undefined);

  const { user } = await getUser();
  if (user) redirect(nextPath);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-10">
      <div className="clay rise p-7 sm:p-9">
      <Link href="/" className="text-sm font-bold text-muted hover:text-ink">
        ← Home
      </Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">
        Log in
      </h1>
      <p className="mt-2 text-muted">
        New here? Signing in with Google creates your account.
      </p>
      {typeof error === "string" && (
        <p role="alert" className="clay-sm tint-blush mt-5 px-4 py-3 text-sm font-bold">
          {error}
        </p>
      )}
      <form action={signInWithGoogle} className="mt-6">
        <input type="hidden" name="next" value={nextPath} />
        <button
          type="submit"
          className="btn btn-primary w-full"
        >
          Continue with Google
        </button>
      </form>
      </div>
    </main>
  );
}
