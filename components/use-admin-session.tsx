"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = { authenticated: boolean; username: string | null };

export function useAdminSession({ require = true }: { require?: boolean } = {}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/session/check", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as Status & {
          error?: string;
        };
        if (cancelled) return;
        setStatus({ authenticated: json.authenticated, username: json.username ?? null });
        if (require && !json.authenticated) {
          router.replace("/admin/login");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Session check failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [require, router]);

  return { status, loading, error };
}
