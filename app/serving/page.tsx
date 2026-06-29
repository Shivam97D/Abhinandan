'use client';

import { useEffect, useState, useMemo } from "react";
import { Loader2, Flame, Sparkles, Check, Clock, UtensilsCrossed, Volume2, VolumeX } from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/utils/supabase/client";

type OrderItem = { id: string; qty: number; price: number; menuItem: { name: string } };
type TokenEntry = {
  id: string;
  tokenNumber: number;
  status: string;
  createdAt: string;
  order: {
    id: string;
    total: number;
    paymentMethod: string | null;
    mobile: string | null;
    items: OrderItem[];
  };
};

// Status settings
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },      // Confirmed
  preparing: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },          // Kitchen
  ready: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },        // Ready to collect
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Pickup",
};

// Generate sound alerts for kitchen staff
function playKitchenChime(type: "new" | "update") {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    if (type === "new") {
      // Warm double beep for new kitchen ticket
      const osc1 = ctx.createOscillator(), gain1 = ctx.createGain();
      osc1.type = "sine"; osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.15, now); gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1); gain1.connect(ctx.destination); osc1.start(now); osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator(), gain2 = ctx.createGain();
      osc2.type = "sine"; osc2.frequency.setValueAtTime(880, now + 0.15); // A5
      gain2.gain.setValueAtTime(0.15, now + 0.15); gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc2.connect(gain2); gain2.connect(ctx.destination); osc2.start(now + 0.15); osc2.stop(now + 0.45);
    } else {
      // Short upward chirp
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // C5 to G5
      gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.25);
    }
  } catch (e) {
    console.error(e);
  }
}

// Elapsed timer helper component
function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const diffMs = Date.now() - new Date(startTime).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) setElapsed("Just now");
      else setElapsed(`${mins}m ago`);
    };

    updateTime();
    const id = setInterval(updateTime, 20000); // update every 20s
    return () => clearInterval(id);
  }, [startTime]);

  return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--muted-warm)] font-medium">
      <Clock size={12} /> {elapsed}
    </span>
  );
}

export default function ServingPage() {
  const [queue, setQueue] = useState<TokenEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load active tokens
  const loadQueue = async () => {
    try {
      const res = await fetch("/api/tokens");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tokens");
      // Filter out serving page irrelevant statuses
      const active = (data.tokens || []).filter((t: TokenEntry) => 
        ["pending", "preparing", "ready"].includes(t.status)
      );
      setQueue(active);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Supabase Realtime Channel
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tokens")
      .on("broadcast", { event: "new_order" }, ({ payload }) => {
        if (["pending", "preparing", "ready"].includes(payload.status)) {
          loadQueue();
          if (soundEnabled) playKitchenChime("new");
        }
      })
      .on("broadcast", { event: "token_update" }, ({ payload }) => {
        const { tokenId, status } = payload;
        
        setQueue((prev) => {
          if (status === "served") {
            return prev.filter((t) => t.id !== tokenId);
          }

          if (!["pending", "preparing", "ready"].includes(status)) {
            return prev.filter((t) => t.id !== tokenId);
          }

          const index = prev.findIndex((t) => t.id === tokenId);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], status };
            return updated;
          } else {
            loadQueue();
            if (soundEnabled) playKitchenChime("new");
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  // Transition token status
  const transitionStatus = async (token: TokenEntry, nextStatus: string) => {
    try {
      if (soundEnabled) playKitchenChime("update");
      
      const res = await fetch("/api/tokens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: token.id,
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Update failed");
      }

      setQueue((prev) => {
        if (nextStatus === "served") {
          return prev.filter((t) => t.id !== token.id);
        }
        return prev.map((t) => (t.id === token.id ? { ...t, status: nextStatus } : t));
      });

    } catch (e: unknown) {
      alert(`Error updating order: ${e instanceof Error ? e.message : "Update failed"}`);
    }
  };

  // Compute counters
  const counters = useMemo(() => {
    return {
      pending: queue.filter((t) => t.status === "pending").length,
      preparing: queue.filter((t) => t.status === "preparing").length,
      ready: queue.filter((t) => t.status === "ready").length,
    };
  }, [queue]);

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[var(--ink)] flex flex-col font-sans">
      
      {/* Heritage Maroon Header */}
      <header 
        className="sticky top-0 z-10 heritage-texture border-b border-white/10 px-5 py-3.5 flex items-center justify-between shadow-md"
        style={{ background: "var(--maroon-deep)" }}
      >
        <div className="flex items-center gap-3">
          <Logo size={24} variant="light" href="/dashboard" />
          <div className="hidden sm:block h-5 w-px bg-white/15" />
          <div className="hidden sm:block">
            <h1 className="text-[12px] font-bold text-[var(--gold-pale)] leading-none uppercase tracking-wider">Kitchen Queue</h1>
            <p className="text-[10px] text-[var(--gold-pale)] opacity-60 mt-0.5">Realtime Serving Console</p>
          </div>
          <div className="hidden lg:flex items-center gap-3 ml-4 border-l border-white/15 pl-4">
            <a href="/counter" className="text-[var(--gold-pale)] opacity-75 hover:opacity-100 text-xs transition-colors font-bold tracking-wide">
              🛒 Counter POS
            </a>
            <a href="/dashboard" className="text-[var(--gold-pale)] opacity-75 hover:opacity-100 text-xs transition-colors font-bold tracking-wide">
              📊 Dashboard
            </a>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex gap-2">
          <div className="bg-[#FFF9E6]/10 border border-[#FCD34D]/20 rounded-xl px-3 py-1 text-center min-w-[70px]">
            <p className="text-[9px] text-[#FCD34D] font-bold uppercase tracking-wider">New</p>
            <p className="text-sm font-black text-amber-300">{counters.pending}</p>
          </div>
          <div className="bg-[#FEF2F2]/10 border border-[#FCA5A5]/20 rounded-xl px-3 py-1 text-center min-w-[70px]">
            <p className="text-[9px] text-[#FCA5A5] font-bold uppercase tracking-wider">Kitchen</p>
            <p className="text-sm font-black text-red-300">{counters.preparing}</p>
          </div>
          <div className="bg-[#ECFDF5]/10 border border-[#A7F3D0]/20 rounded-xl px-3 py-1 text-center min-w-[70px]">
            <p className="text-[9px] text-[#A7F3D0] font-bold uppercase tracking-wider">Ready</p>
            <p className="text-sm font-black text-green-300">{counters.ready}</p>
          </div>
        </div>

        {/* Sound Controls */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-xl border transition-colors flex items-center justify-center ${
            soundEnabled 
              ? "bg-[var(--gold-pale)]/10 border-[var(--gold-pale)]/20 text-[var(--gold-pale)]" 
              : "bg-white/5 border-white/10 text-white/40"
          }`}
          title={soundEnabled ? "Mute Alert Sounds" : "Unmute Alert Sounds"}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </header>

      {/* Main serving grid */}
      <main className="flex-1 p-5 overflow-y-auto max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 size={36} className="text-[var(--amber-brand)] animate-spin" />
            <p className="text-xs text-[var(--muted-warm)]">Syncing active queue…</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white border border-[var(--border-warm)] rounded-2xl p-8 max-w-md mx-auto shadow-sm">
            <p className="text-red-600 text-sm font-semibold">Failed to sync: {error}</p>
            <button 
              onClick={loadQueue} 
              className="mt-4 px-4 py-2 bg-gradient-to-r from-[var(--amber-brand)] to-[var(--amber-deep)] text-[var(--maroon-deep)] font-bold text-xs rounded-xl shadow-md"
            >
              Retry Sync
            </button>
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-32 flex flex-col items-center justify-center gap-4 bg-white border border-[var(--border-warm)] rounded-2xl shadow-sm p-10">
            <div className="w-16 h-16 rounded-3xl bg-[var(--hover-warm)] flex items-center justify-center">
              <UtensilsCrossed size={28} className="text-[var(--muted-warm)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--maroon-deep)]">All caught up!</p>
              <p className="text-xs text-[var(--muted-warm)] mt-1">Confirmed orders will appear here automatically.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {queue.map((token) => {
              const sc = STATUS_COLORS[token.status] || STATUS_COLORS.pending;
              return (
                <div 
                  key={token.id} 
                  className="bg-white rounded-2xl border border-[var(--border-warm)] flex flex-col justify-between overflow-hidden shadow-md hover:shadow-lg transition-all duration-200"
                >
                  
                  {/* Card Header */}
                  <div className={`flex items-center justify-between p-3 sm:p-4 border-b border-[var(--border-warm)] ${sc.bg}/45`}>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[var(--maroon-deep)]">
                        #{String(token.tokenNumber).padStart(3, "0")}
                      </span>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {STATUS_LABELS[token.status] || token.status}
                      </span>
                    </div>
                    <ElapsedTimer startTime={token.createdAt} />
                  </div>

                  {/* Card Items — Large readable list for kitchen staff */}
                  <div className="p-3 sm:p-4 flex-1 space-y-2.5 sm:space-y-3">
                    {token.order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-4">
                        <p className="text-sm sm:text-base font-bold text-[#1C0F0F] leading-tight">
                          <span className="text-[var(--amber-brand)] text-base sm:text-lg mr-1 sm:mr-1.5 font-bold">{item.qty}</span>
                          {" × "}
                          {item.menuItem.name}
                        </p>
                      </div>
                    ))}
                    {token.order.mobile && (
                      <div className="pt-2 sm:pt-2.5 border-t border-dashed border-[var(--border-warm)]">
                        <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--muted-warm)]">📝 Note/Mobile:</p>
                        <p className="text-xs text-[var(--maroon-deep)] font-medium mt-0.5">{token.order.mobile}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Action Button — Big touch-friendly buttons to transition stage */}
                  <div className="p-2.5 sm:p-3 border-t border-[var(--border-warm)] bg-[var(--hover-warm)]/30">
                    {token.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => transitionStatus(token, "preparing")}
                          className="flex-[2] h-10 sm:h-12 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Flame size={13} className="animate-pulse" />
                          <span>🔥 Prepare</span>
                        </button>
                        <button
                          onClick={() => transitionStatus(token, "served")}
                          className="flex-1 h-10 sm:h-12 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Check size={13} />
                          <span>Serve</span>
                        </button>
                      </div>
                    )}

                    {token.status === "preparing" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => transitionStatus(token, "ready")}
                          className="flex-[2] h-10 sm:h-12 rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--maroon-deep)] bg-gradient-to-r from-[var(--amber-brand)] to-[var(--amber-deep)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Sparkles size={13} />
                          <span>🔔 Ready</span>
                        </button>
                        <button
                          onClick={() => transitionStatus(token, "served")}
                          className="flex-1 h-10 sm:h-12 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Check size={13} />
                          <span>Serve</span>
                        </button>
                      </div>
                    )}

                    {token.status === "ready" && (
                      <button
                        onClick={() => transitionStatus(token, "served")}
                        className="w-full h-10 sm:h-12 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Check size={14} />
                        <span>✅ Mark Served</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
