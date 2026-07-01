'use client';

import { Clock } from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import { TeaCupIcon } from "@/components/Logo";

export default function PendingPage() {
  const logout = useLogout();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gold-bg)] p-6">
      <div className="w-full max-w-[380px] text-center bg-white border border-[var(--border-warm)] rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <TeaCupIcon className="w-9 h-9 text-[var(--amber-brand)]" />
          <span className="font-bold text-2xl text-[var(--maroon-deep)]" style={{ fontFamily: "var(--font-deva, serif)" }}>न्याहारी</span>
        </div>
        <div className="w-16 h-16 rounded-full bg-amber-50 grid place-items-center mx-auto mb-4">
          <Clock size={30} className="text-[var(--amber-brand)]" />
        </div>
        <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Awaiting approval</h1>
        <p className="text-sm text-[var(--muted-warm)] mt-2">
          Your account is created but not yet assigned a role. The owner will review and grant
          you access. Please check back after approval.
        </p>
        <button onClick={logout}
          className="mt-6 h-11 px-6 rounded-lg border border-[var(--border-warm)] text-sm font-semibold text-[var(--maroon-deep)] hover:bg-[var(--hover-warm)] transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
