import Link from "next/link";
import { TeaCupIcon } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--gold-bg)] flex flex-col items-center justify-center text-center px-6">
      <TeaCupIcon className="w-16 h-16 text-[var(--amber-brand)] mb-4 opacity-60" />
      <p className="text-7xl font-bold text-[var(--maroon-deep)] opacity-20 leading-none mb-4">404</p>
      <h1 className="text-2xl font-bold text-[var(--maroon-deep)] mb-2">Page not found</h1>
      <p className="text-sm text-[var(--muted-warm)] mb-8 max-w-xs">
        That page doesn&apos;t exist. Maybe the chai got cold and it wandered off.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/order"
          className="btn-amber h-11 px-6 rounded-xl text-sm font-semibold flex items-center justify-center"
        >
          Browse Menu
        </Link>
        <Link
          href="/login"
          className="h-11 px-6 rounded-xl text-sm font-semibold border-2 border-[var(--maroon-deep)] text-[var(--maroon-deep)] flex items-center justify-center hover:bg-[var(--hover-warm)] transition-colors"
        >
          Staff Login
        </Link>
      </div>
    </div>
  );
}
