import { Suspense } from "react";
import { ThemeScope } from "@/components/theme-scope";
import { AdminLoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <ThemeScope mainColor="#0038a8">
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
        <Suspense
          fallback={
            <p className="font-mono text-[11px] tracking-brutal text-brand-slate uppercase">
              Loading…
            </p>
          }
        >
          <AdminLoginForm />
        </Suspense>
      </div>
    </ThemeScope>
  );
}
