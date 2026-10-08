import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { PhotoUpload } from "./photo-upload";

export default async function CreatePage() {
  const { user } = await getUser();
  if (!user) redirect("/login?next=/create");

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-8">
      <Link href="/feed" className="rise text-sm font-bold text-muted hover:text-ink">
        ← Feed
      </Link>
      <h1 className="rise mt-4 text-4xl font-black tracking-tight [--i:1]">Post a photo</h1>
      <p className="rise mt-2 text-muted [--i:2]">
        Bodega cat, dorm view, that one subway moment. Upload it and AI writes
        three captions. Everyone votes on the best one.
      </p>
      <div className="rise mt-8 [--i:3]">
        <PhotoUpload userId={user.id} />
      </div>
    </main>
  );
}
