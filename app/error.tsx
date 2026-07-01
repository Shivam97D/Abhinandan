'use client';

import { useEffect } from "react";
import Link from "next/link";
import { TeaCupIcon } from "@/components/Logo";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console (wire to Sentry / Supabase logs here later)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--gold-bg)] flex flex-col items-center justify-center text-center px-6">
      <TeaCupIcon className="w-16 h-16 text-[var(--amber-brand)] mb-4 opacity-50" />

      <div className="w-14 h-14 rounded-full bg-red-50 grid place-items-center mb-4">
        <AlertCircle size={28} className="text-red-500" />
      </div>

      <h1 className="text-2xl font-bold text-[var(--maroon-deep)] mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-[var(--muted-warm)] mb-1 max-w-xs">
        An unexpected error occurred — we&apos;re sorry! Please try again.
      </p>
      {error.digest && (
        <p className="text-[11px] font-mono text-[var(--muted-warm)]/50 mb-6">
          Error ID: {error.digest}
        </p>
      )}
      {!error.digest && (
        <p className="text-[11px] font-mono text-[var(--muted-warm)]/40 mb-6 max-w-xs break-all">
          {error.message}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="btn-amber h-11 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCw size={15} />
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="h-11 px-6 rounded-xl text-sm font-semibold border-2 border-[var(--maroon-deep)] text-[var(--maroon-deep)] flex items-center justify-center hover:bg-[var(--hover-warm)] transition-colors"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/order"
          className="h-11 px-6 rounded-xl text-sm font-semibold border border-[var(--border-warm)] text-[var(--muted-warm)] flex items-center justify-center hover:bg-[var(--hover-warm)] transition-colors"
        >
          Customer Menu
        </Link>
      </div>
    </div>
  );
}
