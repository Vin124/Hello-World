import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-white font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Hello World
      </h1>
      <Link href="/books" className="text-zinc-500 hover:underline">
        View books →
      </Link>
      <Link href="/members" className="text-zinc-500 hover:underline">
        Members area →
      </Link>
      <Link href="/login" className="text-zinc-500 hover:underline">
        Log in with Google
      </Link>
    </main>
  );
}
