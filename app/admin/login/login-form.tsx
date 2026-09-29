"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session/check", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (json.authenticated) router.replace("/admin");
      } catch {}
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Login failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-xs border border-brand-ink bg-brand-bg p-6"
    >
      <h1 className="font-heavy-title text-3xl uppercase">Admin</h1>
      <p className="font-mono mt-1 mb-4 text-[11px] font-bold tracking-brutal text-brand-slate uppercase">
        Sign in
      </p>

      <label className="block text-[11px] font-bold uppercase tracking-brutal">
        Username
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-2 w-full border border-brand-ink bg-white px-3 py-2 text-sm font-normal tracking-normal normal-case outline-none focus:bg-brand-wash"
          autoComplete="username"
          required
        />
      </label>

      <label className="mt-4 block text-[11px] font-bold uppercase tracking-brutal">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full border border-brand-ink bg-white px-3 py-2 text-sm font-normal tracking-normal normal-case outline-none focus:bg-brand-wash"
          autoComplete="current-password"
          required
        />
      </label>

      {error ? <p className="mt-4 text-xs text-red-600">{error}</p> : null}

      <button
        disabled={loading}
        className="font-mono mt-6 w-full border border-brand-ink bg-brand-accent px-4 py-2 text-[11px] font-bold tracking-brutal text-white uppercase transition-colors hover:bg-brand-accent-dark disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="mt-4 text-[11px] text-brand-slate">
        Credentials come from <code>.env.local</code>
      </p>
    </form>
  );
}
