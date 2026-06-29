'use client';

import { useEffect, useState, useCallback } from "react";
import { Coffee, Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/client";

type TeaEvent = {
  id: string;
  cups: number;
  amount: number;
  source: "sms_auto" | "manual";
  timestamp: string;
  note?: string | null;
  itemName?: string | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function TeaMonitorPage() {
  const [events, setEvents]     = useState<TeaEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [connected, setConnected] = useState(false);

  const loadEvents = useCallback(() => {
    fetch("/api/tea-entry")
      .then(r => r.json())
      .then(d => {
        const raw: Array<{
          id: string; cups: number; amount: number | null; source: string;
          createdAt: string; note: string | null; menuItem?: { name: string } | null;
        }> = d.raw || [];
        setEvents(
          raw.map(e => ({
            id: e.id,
            cups: e.cups,
            amount: e.amount ?? 0,
            source: (e.source === "sms_auto" ? "sms_auto" : "manual") as "sms_auto" | "manual",
            timestamp: e.createdAt,
            note: e.note,
            itemName: e.menuItem?.name ?? null,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Supabase Realtime — listen for new TeaQuickEntry rows
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tea_monitor")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "TeaQuickEntry" },
        (payload) => {
          const r = payload.new as {
            id: string; cups: number; amount: number | null; source: string;
            createdAt: string; note: string | null;
          };
          setEvents(prev => [
            {
              id: r.id,
              cups: r.cups,
              amount: r.amount ?? 0,
              source: r.source === "sms_auto" ? "sms_auto" : "manual",
              timestamp: r.createdAt ?? new Date().toISOString(),
              note: r.note,
              itemName: null,
            },
            ...prev,
          ]);
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalCups    = events.reduce((s, e) => s + e.cups, 0);
  const totalRevenue = events.reduce((s, e) => s + e.amount, 0);
  const autoCount    = events.filter(e => e.source === "sms_auto").length;

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 lg:hidden shrink-0" />
            <div>
              <h1 className="font-display text-xl text-[var(--maroon-deep)]">Tea Auto-Monitor</h1>
              <p className="text-xs text-[var(--muted-warm)]">UPI payments → tea orders, automatically</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          }`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? "Live" : "Connecting…"}
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-5 max-w-3xl">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Cups Today",    value: totalCups,         unit: "cups" },
              { label: "Auto-detected", value: autoCount,         unit: "orders" },
              { label: "Tea Revenue",   value: `₹${Math.round(totalRevenue)}`, unit: "" },
            ].map((s) => (
              <div key={s.label} className="card-warm p-4 text-center">
                <p className="text-xs text-[var(--muted-warm)] uppercase tracking-wide">{s.label}</p>
                <p className="font-display text-2xl text-[var(--maroon-deep)] mt-1">{s.value}</p>
                {s.unit && <p className="text-xs text-[var(--muted-warm)]">{s.unit}</p>}
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="bg-[var(--gold-pale)]/40 border border-[var(--amber-brand)]/25 rounded-xl p-4">
            <p className="text-xs font-semibold text-[var(--pending-brand)] flex items-center gap-1.5 mb-2">
              <AlertCircle size={13} /> How auto-detection works
            </p>
            <ol className="text-xs text-[var(--muted-warm)] space-y-1 list-decimal list-inside">
              <li>Customer scans the shop QR and pays via any UPI app</li>
              <li>Bank sends an SMS credit notification to the shop phone</li>
              <li>SMS Forwarder app (Android) POSTs the SMS to <code className="bg-white px-1 rounded">/api/sms</code></li>
              <li>If amount is ₹12 or a multiple of ₹12, it&apos;s logged as tea (1 cup per ₹12)</li>
              <li>Order appears here in real-time via Supabase Realtime</li>
            </ol>
          </div>

          {/* Event feed */}
          <div>
            <h2 className="font-bold text-[var(--maroon-deep)] text-sm mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Today&apos;s Tea Entries
            </h2>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-[var(--amber-brand)]" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-10 text-[var(--muted-warm)]">
                <Coffee size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tea entries today yet</p>
                <p className="text-xs mt-1">Entries from the Tea Counter or SMS will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <div key={ev.id} className="card-warm flex items-center gap-4 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--maroon-deep)]/10 grid place-items-center shrink-0">
                      <Coffee size={18} className="text-[var(--maroon-deep)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--ink)] text-sm">
                        {ev.cups} cup{ev.cups !== 1 ? "s" : ""} — ₹{Math.round(ev.amount)}
                      </p>
                      <p className="text-xs text-[var(--muted-warm)] truncate">
                        {ev.itemName ?? ev.note ?? (ev.source === "sms_auto" ? "SMS auto-detect" : "Manual entry")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        ev.source === "sms_auto"
                          ? "bg-green-100 text-green-700"
                          : "bg-[var(--gold-pale)] text-[var(--pending-brand)]"
                      }`}>
                        {ev.source === "sms_auto" ? "Auto" : "Manual"}
                      </span>
                      <p className="text-xs text-[var(--muted-warm)] mt-1">{fmtTime(ev.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
      <BottomNav />
    </div>
  );
}
