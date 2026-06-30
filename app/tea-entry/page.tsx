'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { BarChart2, Check, RotateCcw, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
} from "recharts";

type Shift = "morning" | "evening";
type TeaItem = { id: string; name: string; price: number; section: string };
type HistoryEntry = { shift: string; cups: number; amount: number; entries: unknown[] };

const BRAND = "#4A1414";
const AMBER = "#E8920A";

export default function TeaEntryPage() {
  const [teaItems, setTeaItems]       = useState<TeaItem[]>([]);
  const [teaHistory, setTeaHistory]   = useState<HistoryEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [shift, setShift]             = useState<Shift>("evening");
  const [qty, setQty]                 = useState<Record<string, number>>({});
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const loadHistory = () =>
    fetch("/api/tea-entry").then(r => r.json()).then(d => setTeaHistory(d.history || [])).catch(() => {});

  // Restore draft from localStorage on mount, then merge with loaded items
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/menu?t=${Date.now()}`).then(r => r.json()).then(d => {
        const items: TeaItem[] = (d.items || []).filter((m: TeaItem) => m.section === "tea");
        setTeaItems(items);
        // Try restoring saved draft
        try {
          const saved = localStorage.getItem("abh_tea_draft");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.date === new Date().toISOString().split("T")[0]) {
              setShift(parsed.shift || "evening");
              // Only restore keys that exist in the loaded items
              const validIds = new Set(items.map(i => i.id));
              const restored: Record<string, number> = {};
              Object.entries(parsed.qty || {}).forEach(([k, v]) => {
                if (validIds.has(k)) restored[k] = v as number;
              });
              setQty(restored);
              return;
            }
          }
        } catch {}
        setQty(Object.fromEntries(items.map((t: TeaItem) => [t.id, 0])));
      }),
      loadHistory(),
    ]).finally(() => setLoading(false));
  }, []);

  const loadMenuOnly = () => {
    fetch(`/api/menu?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        const items: TeaItem[] = (d.items || []).filter((m: TeaItem) => m.section === "tea");
        setTeaItems(items);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("menu")
      .on("broadcast", { event: "menu_update" }, () => {
        loadMenuOnly();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Persist draft to localStorage on every qty/shift change
  useEffect(() => {
    if (!loading && teaItems.length > 0) {
      localStorage.setItem("abh_tea_draft", JSON.stringify({
        qty, shift, date: new Date().toISOString().split("T")[0],
      }));
    }
  }, [qty, shift, loading, teaItems.length]);

  const bump = (id: string, d: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));
  const reset = (id: string) => setQty((q) => ({ ...q, [id]: 0 }));
  const setVal = (id: string, v: string) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, parseInt(v) || 0) }));

  const totalQty = Object.values(qty).reduce((a, b) => a + b, 0);
  const totalRev = teaItems.reduce((s, t) => s + (qty[t.id] || 0) * t.price, 0);

  const totalCupsToday = teaHistory.reduce((s, h) => s + h.cups, 0);
  const totalRevToday  = teaHistory.reduce((s, h) => s + h.amount, 0);

  const save = async () => {
    const entries = teaItems
      .filter((t) => (qty[t.id] || 0) > 0)
      .map((t) => ({ itemId: t.id, qty: qty[t.id], price: t.price }));

    if (!entries.length) return;
    setSaving(true);
    try {
      await fetch("/api/tea-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shift, entries }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      localStorage.removeItem("abh_tea_draft");
      setQty(Object.fromEntries(teaItems.map((t) => [t.id, 0])));
      await loadHistory();
    } catch {}
    setSaving(false);
  };

  const compareData = teaItems.slice(0, 6).map((t) => {
    const morning = (teaHistory.find(h => h.shift === "morning")?.entries ?? []) as { itemId: string; cups: number }[];
    const evening = (teaHistory.find(h => h.shift === "evening")?.entries ?? []) as { itemId: string; cups: number }[];
    const mQty = morning.filter(e => e.itemId === t.id).reduce((s, e) => s + e.cups, 0);
    const eQty = evening.filter(e => e.itemId === t.id).reduce((s, e) => s + e.cups, 0) || qty[t.id] || 0;
    return { name: t.name.split(" ")[0], Morning: mQty, Evening: eQty };
  });

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-10 bg-[var(--maroon-deep)] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 lg:hidden shrink-0" />
            <span className="text-sm opacity-80 font-semibold">Tea Counter</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs opacity-70 hover:opacity-100 underline">Dashboard</Link>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="text-[var(--amber-brand)] animate-spin" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {/* Shift selector */}
            <div className="grid grid-cols-2 gap-2 bg-[var(--gold-bg)] p-1 rounded-xl">
              {[
                { k: "morning" as Shift, l: "🌅 Morning Shift", sub: "7 AM – 2 PM" },
                { k: "evening" as Shift, l: "🌆 Evening Shift", sub: "2 PM – 10 PM" },
              ].map((s) => (
                <button key={s.k} onClick={() => setShift(s.k)}
                  className={`py-3 rounded-lg font-semibold text-sm transition-colors ${
                    shift === s.k ? "bg-[var(--amber-brand)] text-[var(--maroon-deep)]" : "text-[var(--muted-warm)]"
                  }`}>
                  <div>{s.l}</div>
                  <div className="text-[10px] opacity-80 font-normal">{s.sub}</div>
                </button>
              ))}
            </div>

            {/* Summary stats */}
            <div className="bg-[var(--gold-bg)] rounded-xl p-4">
              <p className="text-sm font-bold text-[var(--maroon-deep)]">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                {[
                  { label: "Tea Items", value: String(teaItems.length) },
                  { label: "Total Cups Today", value: String(totalCupsToday + totalQty) },
                  { label: "Est. Revenue", value: `₹${(totalRevToday + totalRev).toLocaleString("en-IN")}` },
                ].map((m) => (
                  <div key={m.label} className="bg-white rounded-lg py-2">
                    <p className="text-[10px] uppercase text-[var(--muted-warm)] font-semibold">{m.label}</p>
                    <p className="text-base font-bold text-[var(--maroon-deep)]">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={() => setShowCompare(!showCompare)}
                  className="text-xs text-[var(--amber-brand)] font-semibold flex items-center gap-1 hover:underline">
                  vs Yesterday {showCompare ? "▴" : "▾"}
                </button>
              </div>
              {showCompare && teaHistory.length > 0 && (
                <div className="mt-2 bg-white rounded-lg p-3 text-sm border border-[var(--border-warm)]">
                  <div className="space-y-1 text-[var(--muted-warm)]">
                    {teaHistory.map(h => (
                      <p key={h.shift} className="capitalize">
                        {h.shift} shift: <span className="font-bold text-[var(--maroon-deep)]">₹{h.amount.toLocaleString("en-IN")}</span> · {h.cups} cups
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tea items grid */}
            {teaItems.length === 0 ? (
              <div className="text-center py-10 text-[var(--muted-warm)]">
                <p className="text-sm">No tea items in menu yet.</p>
                <Link href="/menu" className="text-xs text-[var(--amber-brand)] hover:underline mt-1 inline-block">Add tea items in Menu Management →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teaItems.map((t) => {
                  const q = qty[t.id] || 0;
                  return (
                    <div key={t.id} className="bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-[var(--maroon-deep)] text-base">{t.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--amber-brand)] font-bold text-sm">₹{t.price}</p>
                          <button onClick={() => reset(t.id)} className="text-[var(--muted-warm)] hover:text-red-600 transition-colors">
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      </div>
                      <input type="number" min={0} value={q} onChange={(e) => setVal(t.id, e.target.value)}
                        className="w-full h-12 text-center text-2xl font-bold text-[var(--maroon-deep)] bg-white border-2 border-[var(--border-warm)] rounded-lg focus:border-[var(--maroon-deep)] focus:outline-none transition-colors" />
                      <div className="grid grid-cols-4 gap-1.5 mt-2">
                        {[-10, -1, +1, +10].map((d) => (
                          <button key={d} onClick={() => bump(t.id, d)}
                            className="h-8 rounded-full border border-[var(--maroon-deep)]/40 text-[var(--maroon-deep)] text-xs font-semibold hover:bg-[var(--maroon-deep)] hover:text-white transition-colors">
                            {d > 0 ? `+${d}` : d}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--muted-warm)] text-center mt-2">
                        ×{q} = ₹{(q * t.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save button */}
            <button onClick={save} disabled={saving || totalQty === 0}
              className={`w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${
                saved ? "bg-green-600 text-white" : "bg-[var(--maroon-deep)] text-white hover:bg-[var(--maroon)]"
              }`}>
              {saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</>
                : saved ? <><Check size={20} /> Saved · ₹{totalRev.toLocaleString("en-IN")}</>
                : `Save ${shift === "morning" ? "Morning" : "Evening"} Shift Entry`}
            </button>

            {/* History table */}
            <div>
              <h3 className="font-bold text-[var(--maroon-deep)] flex items-center gap-2 mb-3 text-sm">
                <BarChart2 size={16} /> Today&apos;s Entries
              </h3>
              <div className="bg-white border border-[var(--border-warm)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--gold-bg)] text-xs uppercase text-[var(--muted-warm)]">
                    <tr>
                      {["Shift", "Cups", "Total"].map((h) => (
                        <th key={h} className={`px-4 py-2 font-semibold ${h !== "Shift" ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teaHistory.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-6 text-[var(--muted-warm)] text-xs">No entries saved today yet</td></tr>
                    ) : (
                      teaHistory.map((h, i) => (
                        <tr key={i} className="border-t border-[var(--border-warm)]">
                          <td className="px-4 py-2 font-semibold text-[var(--maroon-deep)] capitalize">{h.shift}</td>
                          <td className="px-4 py-2 text-right">{h.cups}</td>
                          <td className="px-4 py-2 text-right font-bold text-[var(--maroon-deep)]">₹{h.amount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Comparison chart */}
              {compareData.some(d => d.Morning > 0 || d.Evening > 0) && (
                <div className="mt-4 bg-[var(--gold-bg)] rounded-xl p-4">
                  <p className="text-sm font-semibold text-[var(--maroon-deep)] mb-3">Item-wise shift comparison</p>
                  <div className="h-52">
                    <ResponsiveContainer>
                      <BarChart data={compareData}>
                        <XAxis dataKey="name" stroke="#7A5C4A" fontSize={11} />
                        <YAxis stroke="#7A5C4A" fontSize={11} />
                        <Tooltip contentStyle={{ background: "white", borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="Morning" fill={BRAND} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Evening" fill={AMBER}  radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {saved && (
          <div className="fixed top-4 right-4 bg-[var(--amber-brand)] text-[var(--maroon-deep)] px-5 py-3 rounded-lg shadow-lg font-semibold text-sm z-50">
            ✓ Entry saved for {shift === "morning" ? "Morning" : "Evening"} Shift · Total ₹{totalRev.toLocaleString("en-IN")}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
