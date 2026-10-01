import Image from "next/image";
import Link from "next/link";
import { ContactDock } from "@/components/contact-dock";
import { ThemeScope } from "@/components/theme-scope";
import { profileLinks, type Profile } from "@/lib/types";

/** Split a name so the heavy title can stack it on two lines like the design. */
function nameLines(name: string): string[] {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ["UNNAMED"];
  if (parts.length === 1) return [parts[0].toUpperCase()];
  const last = parts.pop()!.toUpperCase();
  return [parts.join(" ").toUpperCase(), last];
}

function Portrait({ profile }: { profile: Profile }) {
  if (!profile.photo) {
    return (
      <div className="font-heavy-title text-brand-line text-[5rem] leading-none">
        {(profile.name.trim()[0] ?? "?").toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={`/api/photo/${profile.id}`}
      alt={profile.name}
      width={profile.photoWidth || 600}
      height={profile.photoHeight || 900}
      priority
      // className="portrait-mask pointer-events-none h-full max-h-[46dvh] w-auto object-contain object-center"
      className="portrait-mask pointer-events-none h-full w-auto object-contain object-center"

    />
  );
}

/** Full-screen card, used at /u/[id]. */
export function ProfileCard({ profile }: { profile: Profile }) {
  const links = profileLinks(profile.links);
  const [first, ...rest] = nameLines(profile.name);

  return (
    <ThemeScope mainColor={profile.mainColor}>
      <main className="relative mx-auto flex h-[100dvh] w-full max-w-md select-none flex-col justify-between overflow-hidden">
        <section className="relative z-10 shrink-0 px-6 pt-10">
          <p className="font-mono mb-1.5 text-[11px] font-bold tracking-brutal text-brand-accent uppercase">
            NSS CORE
          </p>
          <h1 className="font-heavy-title text-brand-ink text-[3.75rem] uppercase leading-[0.88]">
            <span className="block">{first}</span>
            {rest.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
        </section>

        <section className="relative -my-2 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
          <div className=" relative flex h-full w-full items-center justify-center">
            <Portrait profile={profile} />
          </div>
        </section>

        <section className="relative z-10 shrink-0 px-6 pb-10">
          <div>
            {/* Department / Subtitle */}
            {/* <p className="-mt-0.5 text-brand-slate text-[1.25rem] font-black uppercase leading-tight tracking-tight"> */}
            <h2 className="text-[2.25rem] font-heavy-title text-brand-blue uppercase leading-none tracking-tight">
              {profile.branch || "—"}
            </h2>
            {/* Tenure / Period Tracker */}
            <p className="font-meta mt-2 text-[13px] font-bold tracking-[0.3em] text-brand-slate/70">
              {profile.year || "—"}
            </p>
          </div>
        </section>

        <ContactDock links={links} />
      </main>
    </ThemeScope>
  );
}

/** Compact tile used in the grid on the home page. */
export function ProfileTile({
  profile,
  qr,
}: {
  profile: Profile;
  qr?: string;
}) {
  const [first, ...rest] = nameLines(profile.name);

  return (
    <ThemeScope mainColor={profile.mainColor}>
      <Link
        href={`/u/${profile.id}`}
        className="group flex flex-col border border-brand-ink bg-brand-bg transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-ink px-4 py-2">
          <p className="font-mono text-[10px] font-bold tracking-brutal text-brand-accent uppercase">
            {profile.year || "—"}
          </p>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt=""
              className="h-12 w-12 shrink-0"
              loading="lazy"
            />
          ) : null}
        </div>

        <div className="flex flex-1 items-center justify-center bg-brand-wash px-4 py-6">
          {profile.photo ? (
            <Image
              src={`/api/photo/${profile.id}`}
              alt={profile.name}
              width={profile.photoWidth || 600}
              height={profile.photoHeight || 900}
              className="max-h-52 w-auto object-contain"
            />
          ) : (
            <span className="font-heavy-title text-brand-line text-6xl">
              {(profile.name.trim()[0] ?? "?").toUpperCase()}
            </span>
          )}
        </div>

        <div className="border-t border-brand-ink px-4 py-3">
          <h2 className="font-heavy-title text-brand-ink text-2xl uppercase leading-none">
            <span className="block">{first}</span>
            {rest.map((line) => (
              <span key={line} className="block" >
                {line}
              </span>
            ))}
          </h2>
          <p className="font-mono mt-2 text-[10px] font-bold tracking-brutal text-brand-slate uppercase">
            {profile.branch || "—"}
          </p>
        </div>
      </Link>
    </ThemeScope>
  );
}
