'use client'
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

const TOKEN_KEY = "owner_session_token";

/**
 * Single-device enforcement for the owner — robust against false logouts.
 *
 * At login the owner stores a random token in localStorage AND in the DB. This
 * guard compares the two: it logs out ONLY when this device holds a token that no
 * longer matches the DB (i.e. a newer login elsewhere rotated it). A missing token
 * never triggers a logout, so a single legitimate device is never kicked out.
 * Admin (and any account without a DB token) is exempt automatically.
 */
export function useSessionGuard() {
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const logout = async () => {
      try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
      try { localStorage.removeItem(TOKEN_KEY); } catch {}
      if (!cancelled) window.location.href = "/login?reason=session_expired";
    };

    const verify = async (): Promise<string | null> => {
      try {
        const res = await fetch("/api/users/me", { cache: "no-store" });
        const d = await res.json();
        if (cancelled || !d.user) return null;
        if (d.user.role === "owner" && d.user.sessionToken) {
          const local = localStorage.getItem(TOKEN_KEY);
          // Only a clear conflict logs out: we have a token and it's been superseded.
          if (local && local !== d.user.sessionToken) { await logout(); return null; }
        }
        return d.user.supabaseId ?? null;
      } catch {
        return null;
      }
    };

    verify().then((supabaseId) => {
      if (cancelled || !supabaseId) return;
      channel = supabase
        .channel(`session-${supabaseId}`)
        .on("broadcast", { event: "revoked" }, () => { verify(); })
        .subscribe();
    });

    const interval = setInterval(verify, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}
