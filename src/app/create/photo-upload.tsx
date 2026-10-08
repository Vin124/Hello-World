"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateCaptions } from "./actions";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

// Uploads straight from the browser to Storage (avoids the server action
// body limit), then asks the server to caption it.
export function PhotoUpload({ userId }: { userId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "captioning">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = status !== "idle";

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      setError("Please choose a PNG, JPEG, GIF, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Photo must be 4 MB or smaller.");
      return;
    }

    setError(null);
    setStatus("uploading");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await createClient()
      .storage.from("photos")
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      setStatus("idle");
      setError(uploadError.message);
      return;
    }

    setStatus("captioning");
    const result = await generateCaptions(path);
    if ("error" in result) {
      setStatus("idle");
      setError(result.error);
      return;
    }
    router.push(`/feed?sort=new#${result.imageId}`);
  }

  return (
    <div>
      <label
        className={`clay tint-rose group flex h-64 cursor-pointer flex-col items-center justify-center p-6 text-center transition-transform duration-500 ease-[var(--spring)] hover:-translate-y-1 active:scale-[0.98] ${busy ? "pointer-events-none" : ""}`}
      >
        <span
          className={`clay-sm grid h-16 w-16 place-items-center text-3xl transition-transform duration-500 ease-[var(--spring)] group-hover:scale-110 group-hover:-rotate-6 ${busy ? "animate-bounce" : ""}`}
          aria-hidden
        >
          {status === "captioning" ? "✨" : "📸"}
        </span>
        <span className="mt-4 text-lg font-black" aria-live="polite">
          {status === "uploading"
            ? "Uploading…"
            : status === "captioning"
              ? "Writing your captions…"
              : "Choose a photo"}
        </span>
        <span className="mt-1 text-sm text-muted">PNG, JPEG, GIF, or WebP · up to 4 MB</span>
        <input
          type="file"
          accept={TYPES.join(",")}
          className="sr-only"
          onChange={onChange}
          disabled={busy}
        />
      </label>
      {error && (
        <p role="alert" className="clay-sm tint-blush rise mt-5 px-4 py-3 text-sm font-bold">
          {error}
        </p>
      )}
    </div>
  );
}
