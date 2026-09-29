/** Shared domain types. */

export type ContactIcon = "email" | "instagram" | "phone" | "linkedin";

export type ContactLink = {
  label: string;
  href: string;
  icon: ContactIcon;
  /** Open in a new tab with a safe rel. */
  external?: boolean;
};

/** Contact handles stored per profile. Empty string means "not provided". */
export type Links = {
  email: string;
  phone: string;
  instagram: string;
  linkedin: string;
};

/** One person, stored in the `profiles` collection. */
export type Profile = {
  /** Public random slug, used in /u/[id] and encoded in the QR code. */
  id: string;
  name: string;
  branch: string;
  year: string;
  /** Main colour for this person. Every other colour is derived from it. */
  mainColor: string;
  /** Base64 PNG with an already-removed background. No data: prefix. */
  photo: string | null;
  photoWidth: number;
  photoHeight: number;
  links: Links;
  createdAt: string;
  updatedAt: string;
};

/** Single-row collection holding site-wide defaults. */
export type Settings = {
  _id: "settings";
  /** Main colour handed to newly created profiles. */
  defaultMainColor: string;
};

export const EMPTY_LINKS: Links = {
  email: "",
  phone: "",
  instagram: "",
  linkedin: "",
};

/** Normalise whatever the admin typed into a mailto:/tel:/https:// link. */
export function toHref(kind: ContactIcon, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (kind === "email") return v.startsWith("mailto:") ? v : `mailto:${v}`;
  if (kind === "phone") return v.startsWith("tel:") ? v : `tel:${v.replace(/\s+/g, "")}`;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

/** Build the four dock links for a profile, dropping the ones left empty. */
export function profileLinks(links: Links): ContactLink[] {
  const all: { icon: ContactIcon; label: string; raw: string }[] = [
    { icon: "email", label: "Send Email", raw: links.email },
    { icon: "instagram", label: "Instagram Profile", raw: links.instagram },
    { icon: "phone", label: "Direct Phone Contact", raw: links.phone },
    { icon: "linkedin", label: "LinkedIn Profile", raw: links.linkedin },
  ];

  return all
    .map(({ icon, label, raw }) => ({
      label,
      icon,
      href: toHref(icon, raw),
      external: icon === "instagram" || icon === "linkedin",
    }))
    .filter((link) => link.href !== "");
}
