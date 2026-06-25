'use client';

import { useEffect, useState } from "react";
import { Coffee, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

type TeaEvent = {
  id: string;
  cups: number;
  amount: number;
  source: "SMS_AUTO" | "MANUAL";
  timestamp: string;
  note?: string;
};

// Demo events for UI — replaced with Supabase Realtime subscription when DB is ready
const DEMO_EVENTS: TeaEvent[] = [
  { id: "e1", cups: 2, amount: 24,  source: "SMS_AUTO", timestamp: new Date(Date.now() - 120000).toISOString(), note: "HDFC UPI credit" },
  { id: "e2", cups: 1, amount: 12,  source: "SMS_AUTO", timestamp: new Date(Date.now() - 480000).toISOString(), note: "Paytm UPI" },
  { id: "e3", cups: 4, amount: 48,  source: "SMS_AUTO", timestamp: new Date(Date.now() - 900000).toISOString(), note: "SBI UPI" },
  { id: "e4", cups: 3, amount: 36,  source: "MANUAL",   timestamp: new Date(Date.now() - 1800000).toISOString(), note: "Cash" },
  { id: "e5", cups: 5, amount: 60,  source: "SMS_AUTO", timestamp: new Date(Date.now() - 3600000).toISOString(), note: "ICICI UPI" },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function TeaMonitorPage() {
  const [events] = useState<TeaEvent[]>(DEMO_EVENTS);
  const [connected, setConnected] = useState(false);
  const [totalCups, setTotalCups] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const cups = events.reduce((s, e) => s + e.cups, 0);
    const rev  = events.reduce((s, e) => s + e.amount, 0);
    setTotalCups(cups);
    setTotalRevenue(rev);
  }, [events]);

  // Simulate realtime event arriving
  useEffect(() => {
    // TODO: replace with Supabase Realtime
    // const channel = supabase
    //   .channel("tea_auto")
    //   .on("postgres_changes", { event: "INSERT", schema: "public", table: "TeaQuickEntry" }, (payload) => {
    //     setEvents((prev) => [mapPayload(payload.new), ...prev]);
    //   })
    //   .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    // return () => { supabase.removeChannel(channel); };

    const timer = setTimeout(() => setConnected(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="lg:hidden"><Logo size={22} /></div>
            <div>
              <h1 className="font-display text-xl text-[var(--maroon-deep)]">Tea Auto-Monitor</h1>
              <p className="text-xs text-[var(--muted-warm)]">UPI payments → tea orders, automatically</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            connected ? "bg-[var(--success-brand)]/10 text-[var(--success-brand)]" : "bg-red-100 text-red-600"
          }`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? "Live" : "Connecting…"}
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-5 max-w-3xl">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Cups Today",    value: totalCups,        unit: "cups" },
              { label: "Auto-detected", value: events.filter((e) => e.source === "SMS_AUTO").length, unit: "orders" },
              { label: "Tea Revenue",   value: `₹${totalRevenue}`, unit: "" },
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
              <span className="w-2 h-2 rounded-full bg-[var(--success-brand)] animate-pulse" />
              Today&apos;s Tea Orders
            </h2>
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="card-warm flex items-center gap-4 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--maroon-deep)]/10 grid place-items-center shrink-0">
                    <Coffee size={18} className="text-[var(--maroon-deep)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--ink)] text-sm">
                      {ev.cups} cup{ev.cups !== 1 ? "s" : ""} — ₹{ev.amount}
                    </p>
                    <p className="text-xs text-[var(--muted-warm)] truncate">{ev.note}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      ev.source === "SMS_AUTO"
                        ? "bg-[var(--success-brand)]/10 text-[var(--success-brand)]"
                        : "bg-[var(--gold-pale)] text-[var(--pending-brand)]"
                    }`}>
                      {ev.source === "SMS_AUTO" ? "Auto" : "Manual"}
                    </span>
                    <p className="text-xs text-[var(--muted-warm)] mt-1">{fmtTime(ev.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
      <BottomNav />
    </div>
  );
}
