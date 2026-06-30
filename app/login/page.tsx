'use client';

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { TeaCupIcon } from "@/components/Logo";
import { createClient } from "@/utils/supabase/client";

const ROLE_ROUTES: Record<string, string> = {
  owner:           "/dashboard",
  section_manager: "/serving",
  snacks_staff:    "/counter",
  tea_staff:       "/tea-entry",
};

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Enter username and password"); return; }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const email = `${username.toLowerCase().trim()}@abhinandan.in`;

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError("Invalid username or password");
      return;
    }

    const role = (data.user?.user_metadata?.role as string) || "owner";

    // Set up owner single-device session (exempting the developer admin account)
    if (role === "owner" && email !== "admin@abhinandan.in") {
      try {
        const sRes = await fetch("/api/auth/session", { method: "POST" });
        if (sRes.ok) {
          const { sessionToken } = await sRes.json();
          if (sessionToken) {
            document.cookie = `owner_session_token=${sessionToken}; path=/; max-age=31536000; SameSite=Lax;`;
          }
        }
      } catch (err) {
        console.error("Failed to establish session token:", err);
      }
    }

    router.push(ROLE_ROUTES[role] || "/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Left: brand panel ────────────────────────────── */}
      <div
        className="relative overflow-hidden text-[var(--gold-pale)] p-10 md:p-14 flex flex-col md:w-1/2 min-h-[280px] md:min-h-screen"
        style={{ background: "var(--maroon-deep)" }}
      >
        {/* CSS animated background instead of external video */}
        <div className="absolute inset-0 heritage-texture opacity-60" />
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 80%, rgba(232,146,10,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 80% 20%, rgba(74,20,20,0.6) 0%, transparent 70%)
            `,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3">
            <TeaCupIcon className="w-10 h-10 text-[var(--amber-brand)]" />
            <div>
              <span
                className="font-bold text-2xl text-[var(--gold-pale)] leading-none block"
                style={{ fontFamily: "var(--font-deva, 'Noto Serif Devanagari', serif)" }}
              >
                न्याहारी
              </span>
              <span className="text-xs text-[var(--gold-pale)]/50 tracking-wider uppercase">Tea & Snacks Centre</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center mt-10 md:mt-0">
            <h2 className="text-3xl md:text-4xl font-bold leading-snug text-[var(--gold-pale)] max-w-xs">
              Where every cup<br />tells a story
            </h2>
            <div className="h-0.5 w-12 bg-[var(--amber-brand)] my-6" />
            <p className="text-sm text-[var(--gold-pale)]/60 max-w-xs leading-relaxed">
              Serving Maharashtra&apos;s finest snacks and hot chai.<br />Fresh, delicious, always on time.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { v: "Full", l: "Nasta Centre" },
              { v: "Fresh", l: "Daily Snacks" },
              { v: "Best", l: "Quality Tea" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(245,215,158,0.12)" }}>
                <div className="font-bold text-base text-[var(--gold-pale)] leading-none">{s.v}</div>
                <div className="text-[10px] text-[var(--gold-pale)]/40 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: login form ─────────────────────────────── */}
      <div className="flex-1 bg-[var(--gold-bg)] flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-[360px]">

          {reason === "session_expired" && (
            <div className="mb-6 text-sm text-[#A16207] bg-yellow-50 border border-yellow-200 rounded-xl p-3.5 text-left">
              💡 <b>Logged out:</b> Your account was logged in from another device.
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--maroon-deep)]">Welcome Back</h1>
            <p className="text-sm text-[var(--muted-warm)] mt-1">Sign in to your staff panel</p>
            <div className="h-0.5 w-10 bg-[var(--amber-brand)] mt-3" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. suresh, ramesh, sunita"
                autoComplete="username"
                className="w-full h-12 px-4 bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:ring-2 focus:ring-[var(--amber-brand)]/20 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-12 px-4 pr-11 bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:ring-2 focus:ring-[var(--amber-brand)]/20 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-warm)] hover:text-[var(--brown)] transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <label className="flex items-center gap-2 text-sm text-[var(--ink)] cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded accent-[var(--amber-brand)]" />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-amber w-full h-12 text-sm mt-6 flex items-center justify-center rounded-lg"
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          <p className="mt-4 text-xs text-[var(--muted-warm)] text-center">
            Role is auto-detected from your username
          </p>

          <Link
            href="/order"
            className="block mt-4 text-center text-sm text-[var(--brown)] hover:text-[var(--maroon-deep)] transition-colors"
          >
            Customer? Tap here to order ↗
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Loading login…</div>}>
      <LoginForm />
    </Suspense>
  );
}
