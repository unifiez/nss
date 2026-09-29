import type { Metadata } from "next";
import { ProfileTile } from "@/components/profile-card";
import { ThemeScope } from "@/components/theme-scope";
import { getDbConfiguredMessage, isDbConfigured } from "@/lib/db";
import { getDefaultMainColor, listProfilesSafe } from "@/lib/profiles";
import { qrDataUrl } from "@/lib/qr";
import { getProfileUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "NSS \u2014 Profiles",
  description: "Scan or pick a profile.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isDbConfigured()) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-3 px-6">
        <h1 className="font-heavy-title text-3xl uppercase">Setup needed</h1>
        <p className="text-brand-slate text-sm">{getDbConfiguredMessage()}</p>
      </main>
    );
  }

  const [profiles, defaultColor] = await Promise.all([
    listProfilesSafe(),
    getDefaultMainColor(),
  ]);

  if (profiles.length === 0) {
    return (
      <ThemeScope mainColor={defaultColor}>
        <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-3 px-6">
          <h1 className="font-heavy-title text-4xl uppercase">No profiles yet</h1>
          <p className="text-brand-slate text-sm">
            Open the admin panel to add the first person.
          </p>
          <a
            href="/admin"
            className="font-mono mt-4 self-start border border-brand-ink px-4 py-2 text-[11px] font-bold tracking-brutal uppercase transition-colors hover:bg-brand-wash"
          >
            Open admin
          </a>
        </main>
      </ThemeScope>
    );
  }

  const qrs = await Promise.all(
    profiles.map((p) => qrDataUrl(getProfileUrl(p.id), p.mainColor)),
  );

  return (
    <ThemeScope mainColor={defaultColor}>
      <main className="mx-auto min-h-[100dvh] w-full max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-end justify-between gap-4 border-b border-brand-ink pb-4">
          <div>
            <p className="font-mono text-[11px] font-bold tracking-brutal text-brand-accent uppercase">
              NSS CORE
            </p>
            <h1 className="font-heavy-title text-4xl uppercase">Profiles</h1>
          </div>
          <p className="font-mono text-[11px] font-bold tracking-brutal text-brand-slate uppercase">
            {profiles.length} total
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {profiles.map((profile, i) => (
            <ProfileTile key={profile.id} profile={profile} qr={qrs[i]} />
          ))}
        </div>
      </main>
    </ThemeScope>
  );
}
