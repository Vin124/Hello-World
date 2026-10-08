import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { PhotoUpload } from "./photo-upload";

export default async function CreatePage() {
  const { user } = await getUser();
  if (!user) redirect("/login?next=/create");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 font-sans">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Feed
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Post a photo
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Bodega cat, dorm view, that one subway moment. Upload it and AI writes
        three captions. Everyone votes on the best one.
      </p>
      <div className="mt-8">
        <PhotoUpload userId={user.id} />
      </div>
    </main>
  );
}
