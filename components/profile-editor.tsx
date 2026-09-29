"use client";

import { useState } from "react";
import { PhotoField, type PhotoValue } from "@/components/photo-field";

export type ProfileDraft = {
  id?: string;
  name: string;
  branch: string;
  year: string;
  mainColor: string;
  links: { email: string; phone: string; instagram: string; linkedin: string };
} & PhotoValue;

const emptyDraft = (mainColor: string): ProfileDraft => ({
  name: "",
  branch: "",
  year: "",
  mainColor,
  photo: null,
  photoWidth: 0,
  photoHeight: 0,
  links: { email: "", phone: "", instagram: "", linkedin: "" },
});

export function ProfileEditor({
  initial,
  defaultMainColor,
  onSaved,
  onCancel,
}: {
  initial?: ProfileDraft | null;
  defaultMainColor: string;
  onSaved: (profile: unknown) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(initial ?? emptyDraft(defaultMainColor));
  const [preview, setPreview] = useState<string | null>(
    initial?.photo ? `/api/photo/${initial.id}` : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setLink = (key: keyof ProfileDraft["links"], value: string) =>
    setDraft((d) => ({ ...d, links: { ...d.links, [key]: value } }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const isEdit = Boolean(initial?.id);
    const res = await fetch(
      isEdit ? `/api/admin/profiles/${initial!.id}` : "/api/admin/profiles",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
    ).catch(() => null);

    const json = await res?.json().catch(() => ({}));

    if (!res || !res.ok) {
      setError(json?.error ?? "Could not save. Is the database configured?");
      setBusy(false);
      return;
    }

    onSaved(json.profile);
  }

  return (
    <form onSubmit={submit} className="border border-brand-ink bg-brand-bg p-4">
      <h2 className="font-heavy-title text-2xl uppercase">
        {initial?.id ? "Edit profile" : "New profile"}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-[11px] font-bold uppercase tracking-brutal">
          Name
          <input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-2 w-full border border-brand-ink bg-white px-3 py-2 text-sm font-normal tracking-normal normal-case outline-none focus:bg-brand-wash"
            required
          />
        </label>

        <label className="block text-[11px] font-bold uppercase tracking-brutal">
          Branch
          <input
            value={draft.branch}
            onChange={(e) => set("branch", e.target.value)}
            placeholder="Computer Science"
            className="mt-2 w-full border border-brand-ink bg-white px-3 py-2 text-sm font-normal tracking-normal normal-case outline-none focus:bg-brand-wash"
          />
        </label>

        <label className="block text-[11px] font-bold uppercase tracking-brutal">
          Year
          <input
            value={draft.year}
            onChange={(e) => set("year", e.target.value)}
            placeholder="2025 — 29"
            className="mt-2 w-full border border-brand-ink bg-white px-3 py-2 text-sm font-normal tracking-normal normal-case outline-none focus:bg-brand-wash"
          />
        </label>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-brutal">Theme colour</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={draft.mainColor}
              onChange={(e) => set("mainColor", e.target.value)}
              className="h-10 w-14 cursor-pointer border border-brand-ink bg-white p-1"
              aria-label="Pick a theme colour"
            />
            <input
              value={draft.mainColor}
              onChange={(e) => set("mainColor", e.target.value)}
              className="w-28 border border-brand-ink bg-white px-2 py-2 font-mono text-xs"
              aria-label="Theme colour hex"
            />
          </div>
          <p className="mt-1 text-[11px] text-brand-slate">
            Every other colour on this profile is derived from this.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <PhotoField
          value={draft.photo}
          previewUrl={preview}
          onChange={(v) => {
            setDraft((d) => ({ ...d, ...v }));
            setPreview(null);
          }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["email", "Email", "contact@example.com"],
            ["phone", "Mobile", "+91 90000 00000"],
            ["instagram", "Instagram", "instagram.com/handle"],
            ["linkedin", "LinkedIn", "linkedin.com/in/handle"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key} className="block text-[11px] font-bold uppercase tracking-brutal">
            {label}
            <input
              value={draft.links[key]}
              onChange={(e) => setLink(key, e.target.value)}
              placeholder={placeholder}
              className="mt-2 w-full border border-brand-ink bg-white px-3 py-2 text-sm font-normal tracking-normal normal-case outline-none focus:bg-brand-wash"
            />
          </label>
        ))}
      </div>

      {error ? <p className="mt-4 text-xs text-red-600">{error}</p> : null}

      <div className="mt-6 flex gap-2">
        <button
          disabled={busy}
          className="font-mono border border-brand-ink bg-brand-accent px-4 py-2 text-[11px] font-bold tracking-brutal text-white uppercase transition-colors hover:bg-brand-accent-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : initial?.id ? "Save changes" : "Create profile"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono border border-brand-ink px-4 py-2 text-[11px] font-bold tracking-brutal uppercase transition-colors hover:bg-brand-wash"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
