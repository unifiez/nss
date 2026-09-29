import type { ContactLink } from "@/lib/types";

/**
 * 4-column bordered bottom dock. Renders only the links a profile actually
 * filled in, so the columns re-flow instead of leaving dead cells.
 */
export function ContactDock({ links }: { links: ContactLink[] }) {
  if (links.length === 0) return null;

  const Icon = ({ icon }: { icon: ContactLink["icon"] }) => {
    const shared = {
      className: "h-5 w-5 text-brand-ink",
      xmlns: "http://www.w3.org/2000/svg",
    } as const;

    switch (icon) {
      case "email":
        return (
          <svg {...shared} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "instagram":
        return (
          <svg {...shared} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <rect height="19" rx="5.5" strokeLinecap="round" strokeLinejoin="round" width="19" x="2.5" y="2.5" />
            <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeLinecap="round" strokeLinejoin="round" />
            <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        );
      case "phone":
        return (
          <svg {...shared} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <rect height="19" rx="2.5" strokeLinecap="round" strokeLinejoin="round" width="11" x="6.5" y="2.5" />
            <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" x1="11" x2="13" y1="18" y2="18" />
          </svg>
        );
      case "linkedin":
        return (
          <svg {...shared} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.63 1.63 0 1 0 0-3.26 1.63 1.63 0 0 0 0 3.26m1.39 9.74v-8.37H5.07v8.37h2.78z" />
          </svg>
        );
    }
  };

  return (
    <footer
      data-purpose="contact-dock"
      className="grid w-full shrink-0 border-t border-brand-ink bg-brand-bg"
      style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
    >
      {links.map((link) => (
        <a
          key={link.icon}
          href={link.href}
          aria-label={link.label}
          {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="flex h-14 items-center justify-center border-r border-brand-ink transition-colors last:border-r-0 hover:bg-brand-wash"
        >
          <Icon icon={link.icon} />
        </a>
      ))}
    </footer>
  );
}
