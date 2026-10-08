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
    router.push(`/#${result.imageId}`);
  }

  return (
    <div>
      <label
        className={`flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 text-center text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900 ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="font-medium text-black dark:text-zinc-50">
          {status === "uploading"
            ? "Uploading…"
            : status === "captioning"
              ? "Writing captions…"
              : "Choose a photo"}
        </span>
        <span className="mt-1 text-sm">PNG, JPEG, GIF, or WebP · up to 4 MB</span>
        <input
          type="file"
          accept={TYPES.join(",")}
          className="sr-only"
          onChange={onChange}
          disabled={busy}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
