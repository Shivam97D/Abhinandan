'use client';

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { TeaCupIcon } from "@/components/Logo";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) { setError("Fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not create account"); return; }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gold-bg)] p-6">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <TeaCupIcon className="w-9 h-9 text-[var(--amber-brand)]" />
          <span className="font-bold text-2xl text-[var(--maroon-deep)]" style={{ fontFamily: "var(--font-deva, serif)" }}>न्याहारी</span>
        </div>

        {done ? (
          <div className="text-center bg-white border border-[var(--border-warm)] rounded-2xl p-8">
            <CheckCircle2 size={48} className="text-[var(--success-brand)] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Account created!</h1>
            <p className="text-sm text-[var(--muted-warm)] mt-2">
              Your request has been sent. The owner will review and assign your role.
              You&apos;ll be able to sign in once approved.
            </p>
            <Link href="/login" className="btn-amber inline-flex h-11 px-6 mt-6 items-center justify-center rounded-lg text-sm">
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[var(--border-warm)] rounded-2xl p-7">
            <h1 className="text-2xl font-bold text-[var(--maroon-deep)]">Create staff account</h1>
            <p className="text-sm text-[var(--muted-warm)] mt-1">The owner will assign your role after you sign up</p>
            <div className="h-0.5 w-10 bg-[var(--amber-brand)] mt-3 mb-6" />

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Patil"
                  className="w-full h-12 px-4 bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:ring-2 focus:ring-[var(--amber-brand)]/20 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g. ramesh" autoComplete="username"
                  className="w-full h-12 px-4 bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:ring-2 focus:ring-[var(--amber-brand)]/20 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters" autoComplete="new-password"
                    className="w-full h-12 px-4 pr-11 bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:ring-2 focus:ring-[var(--amber-brand)]/20 outline-none transition" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-warm)] hover:text-[var(--brown)] transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="btn-amber w-full h-12 text-sm mt-6 flex items-center justify-center rounded-lg">
              {loading ? "Creating…" : "Create Account →"}
            </button>

            <Link href="/login" className="block mt-4 text-center text-sm text-[var(--brown)] hover:text-[var(--maroon-deep)] transition-colors">
              Already have an account? Sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
