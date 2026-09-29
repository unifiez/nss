"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfileEditor, type ProfileDraft } from "@/components/profile-editor";
import { ThemeScope } from "@/components/theme-scope";
import { useAdminSession } from "@/components/use-admin-session";
import { getProfileUrl } from "@/lib/site-url";
import type { Profile } from "@/lib/types";

type Panel = { kind: "form"; draft: ProfileDraft | null } | { kind: "list" } | null;

export default function AdminDashboard() {
  const router = useRouter();
  const { status, loading } = useAdminSession();
  const [defaultMainColor, setDefaultMainColor] = useState("#0038a8");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/profiles", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setProfiles(json.profiles ?? []);
      setError(null);
    } else {
      setError(json.error ?? "Could not load profiles.");
    }
  }

  useEffect(() => {
    if (loading || !status?.authenticated) return;
    (async () => {
      await refresh();
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.defaultMainColor) setDefaultMainColor(json.defaultMainColor);
    })();
  }, [loading, status?.authenticated]);

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  async function saveDefaultColor(color: string) {
    setDefaultMainColor(color);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultMainColor: color }),
    }).catch(() => {});
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/profiles/${id}`, { method: "DELETE" });
    if (res.ok) {
      await refresh();
      setPanel(null);
    }
  }

  async function copyLink(id: string) {
    const url = getProfileUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  if (loading) {
    return <main className="p-8 text-sm text-brand-slate">Checking session…</main>;
  }
  if (!status?.authenticated) {
    return (
      <main className="p-8">
        <p className="text-sm text-brand-slate">Redirecting to login…</p>
      </main>
    );
  }

  return (
    <ThemeScope mainColor={defaultMainColor}>
      <main className="mx-auto min-h-[100dvh] w-full max-w-4xl px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-ink pb-4">
          <div>
            <p className="font-mono text-[11px] font-bold tracking-brutal text-brand-accent uppercase">
              Admin
            </p>
            <h1 className="font-heavy-title text-4xl uppercase">Profiles</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-mono border border-brand-ink px-3 py-2 text-[11px] font-bold tracking-brutal uppercase transition-colors hover:bg-brand-wash"
            >
              View site
            </Link>
            <button
              onClick={logout}
              className="font-mono border border-brand-ink px-3 py-2 text-[11px] font-bold tracking-brutal uppercase transition-colors hover:bg-brand-wash"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-brand-ink p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-brutal">
              Default colour for new profiles
            </p>
            <p className="mt-1 text-[11px] text-brand-slate">
              Each profile can still override this with its own colour.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={defaultMainColor}
              onChange={(e) => saveDefaultColor(e.target.value)}
              className="h-10 w-16 cursor-pointer border border-brand-ink bg-white p-1"
              aria-label="Default theme colour"
            />
            <span className="font-mono text-xs">{defaultMainColor}</span>
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between gap-4">
          <h2 className="font-heavy-title text-2xl uppercase">
            {profiles.length} profile{profiles.length === 1 ? "" : "s"}
          </h2>
          <button
            onClick={() => setPanel({ kind: "form", draft: null })}
            className="font-mono bg-brand-accent px-4 py-2 text-[11px] font-bold tracking-brutal text-white uppercase transition-colors hover:bg-brand-accent-dark"
          >
            New profile
          </button>
        </div>

        {error ? (
          <p className="mt-4 border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {panel?.kind === "form" ? (
          <div className="mt-4">
            <ProfileEditor
              initial={panel.draft}
              defaultMainColor={defaultMainColor}
              onCancel={() => setPanel(null)}
              onSaved={async () => {
                setPanel(null);
                await refresh();
              }}
            />
          </div>
        ) : null}

        <ul className="mt-4 grid gap-3">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex flex-wrap items-center gap-4 border border-brand-ink bg-brand-bg p-3"
            >
              <span
                aria-hidden
                className="h-10 w-2 shrink-0"
                style={{ backgroundColor: profile.mainColor }}
              />

              <div className="h-14 w-12 shrink-0 items-center justify-center overflow-hidden border border-brand-line bg-brand-wash">
                {profile.photo ? (
                  <Image
                    src={`/api/photo/${profile.id}`}
                    alt=""
                    width={64}
                    height={80}
                    className="max-h-14 w-auto object-contain"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold uppercase">{profile.name}</p>
                <p className="font-mono truncate text-[11px] text-brand-slate">
                  {profile.branch || "—"} · {profile.year || "—"} · /u/{profile.id}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyLink(profile.id)}
                  className="font-mono border border-brand-ink px-3 py-2 text-[11px] font-bold tracking-brutal uppercase transition-colors hover:bg-brand-wash"
                >
                  {copied === profile.id ? "Copied" : "Copy link"}
                </button>
                <button
                  onClick={() =>
                    setPanel({
                      kind: "form",
                      draft: {
                        id: profile.id,
                        name: profile.name,
                        branch: profile.branch,
                        year: profile.year,
                        mainColor: profile.mainColor,
                        photo: profile.photo,
                        photoWidth: profile.photoWidth,
                        photoHeight: profile.photoHeight,
                        links: profile.links,
                      },
                    })
                  }
                  className="font-mono border border-brand-ink px-3 py-2 text-[11px] font-bold tracking-brutal uppercase transition-colors hover:bg-brand-wash"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(profile.id, profile.name)}
                  className="font-mono border border-red-400 px-3 py-2 text-[11px] font-bold tracking-brutal text-red-600 uppercase transition-colors hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {profiles.length === 0 && !error ? (
          <p className="mt-6 text-sm text-brand-slate">
            No profiles yet. Create the first one to get a shareable link and QR code.
          </p>
        ) : null}
      </main>
    </ThemeScope>
  );
}
