import { ThemeScope } from "@/components/theme-scope";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin \u2014 NSS",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ThemeScope mainColor="#0038a8">{children}</ThemeScope>;
}
