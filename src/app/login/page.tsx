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
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12 font-sans">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Log in
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        New here? Signing in with Google creates your account.
      </p>
      {typeof error === "string" && (
        <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <form action={signInWithGoogle} className="mt-6">
        <input type="hidden" name="next" value={nextPath} />
        <button
          type="submit"
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 font-medium text-black hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
