import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileCard } from "@/components/profile-card";
import { isDbConfigured } from "@/lib/db";
import { getProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isDbConfigured()) return { title: "NSS" };
  const { id } = await params;
  const profile = await getProfile(id).catch(() => null);
  if (!profile) return { title: "Not found \u2014 NSS" };
  return {
    title: `${profile.name} \u2014 NSS`,
    description: profile.branch || undefined,
  };
}

export default async function PublicProfilePage({ params }: Params) {
  if (!isDbConfigured()) notFound();

  const { id } = await params;
  const profile = await getProfile(id).catch(() => null);
  if (!profile) notFound();

  return <ProfileCard profile={profile} />;
}
