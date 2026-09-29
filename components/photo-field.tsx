"use client";

import { useRef, useState } from "react";

const MAX_DIMENSION = 900;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export type PhotoValue = {
  photo: string | null;
  photoWidth: number;
  photoHeight: number;
};

/**
 * Reads a user-supplied image and downscales it in the browser before upload.
 * The person is expected to have already removed the background, so this does
 * no segmentation — it only shrinks the file to something Mongo can hold.
 */
async function fileToResizedBase64(file: File): Promise<PhotoValue> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That file is not a readable image."));
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.drawImage(img, 0, 0, width, height);

  // Always emit PNG so transparency from a removed background survives.
  const out = canvas.toDataURL("image/png");
  const base64 = out.split(",")[1] ?? "";

  return {
    photo: base64 || null,
    photoWidth: width,
    photoHeight: height,
  };
}

export function PhotoField({
  value,
  onChange,
  previewUrl,
}: {
  value: string | null;
  onChange: (next: PhotoValue) => void;
  previewUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = previewUrl ?? (value ? `data:image/png;base64,${value}` : null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image is larger than 8MB. Please compress it first.");
      return;
    }

    setBusy(true);
    try {
      onChange(await fileToResizedBase64(file));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-brutal">Photo</p>
      <p className="mt-1 text-[11px] text-brand-slate">
        Transparent PNG preferred — remove the background before uploading.
      </p>

      <div className="mt-2 flex items-start gap-4">
        <div className="flex h-32 w-24 shrink-0 items-center justify-center border border-brand-ink bg-brand-wash">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="max-h-32 max-w-24 object-contain" />
          ) : (
            <span className="font-heavy-title text-brand-line text-3xl">?</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="font-mono border border-brand-ink px-3 py-2 text-[11px] font-bold tracking-brutal uppercase transition-colors hover:bg-brand-wash disabled:opacity-60"
          >
            {busy ? "Processing…" : value ? "Replace photo" : "Upload photo"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange({ photo: null, photoWidth: 0, photoHeight: 0 })}
              className="font-mono border border-brand-ink px-3 py-2 text-[11px] font-bold tracking-brutal uppercase transition-colors hover:bg-brand-wash"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
