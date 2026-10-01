import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileCard } from "@/components/profile-card";
import { isDbConfigured } from "@/lib/db";
import { getProfileBySlug } from "@/lib/profiles";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isDbConfigured()) return { title: "NSS" };
  const { slug } = await params;
  const profile = await getProfileBySlug(slug).catch(() => null);
  if (!profile) return { title: "Not found — NSS" };
  return {
    title: `${profile.name} — NSS`,
    description: profile.branch || undefined,
  };
}

export default async function PublicProfilePage({ params }: Params) {
  if (!isDbConfigured()) notFound();

  const { slug } = await params;
  // Accepts either the chosen username or the legacy random id, so links and
  // QR codes printed before usernames existed keep resolving.
  const profile = await getProfileBySlug(slug).catch(() => null);
  if (!profile) notFound();

  return <ProfileCard profile={profile} />;
}