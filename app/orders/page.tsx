'use client';

import { useEffect, useState, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

type RawOrder = {
  id: string;
  tokenNumber: number | null;
  source: string;
  status: string;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
  items: { qty: number; price: number; menuItem: { name: string; section: string } }[];
  token?: { status: string } | null;
};

type DisplayOrder = {
  id: string;
  token: string;
  source: string;
  items: string;
  amount: number;
  paymentMethod: string;
  status: string;
  date: string;
  time: string;
  rawDate: Date;
};

type Period = "Today" | "Week" | "Month";

const STATUS_STYLES: Record<string, string> = {
  pending:          "bg-amber-50 text-amber-700 border border-amber-200",
  awaiting_payment: "bg-orange-50 text-orange-700 border border-orange-200",
  preparing:        "bg-red-50 text-red-700 border border-red-200",
  ready:            "bg-blue-50 text-blue-700 border border-blue-200",
  served:           "bg-green-50 text-green-700 border border-green-200",
  confirmed:        "bg-blue-50 text-blue-700 border border-blue-200",
  cancelled:        "bg-red-50 text-red-600 border border-red-200",
};

function periodStart(p: Period): Date {
  const now = new Date();
  if (p === "Today") return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  if (p === "Week") { const d = new Date(now); d.setDate(d.getDate() - 6); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
}

export default function OrdersPage() {
  const [rawOrders, setRawOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [source, setSource]       = useState("All");
  const [status, setStatus]       = useState("All");
  const [period, setPeriod]       = useState<Period>("Today");

  useEffect(() => {
    setLoading(true);
    fetch("/api/orders")
      .then(r => r.json())
      .then(d => {
        const orders: RawOrder[] = d.orders || [];
        setRawOrders(orders.map(o => ({
          id: o.id,
          token: o.tokenNumber ? `#${String(o.tokenNumber).padStart(3, "0")}` : "—",
          source: o.source,
          items: o.items.map(i => `${i.menuItem.name} ×${i.qty}`).join(", "),
          amount: Math.round(o.total),
          paymentMethod: o.paymentMethod || "pending",
          status: o.token?.status ?? o.status,
          date: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          time: new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          rawDate: new Date(o.createdAt),
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const ps = periodStart(period);
    return rawOrders.filter(o => {
      const matchPeriod  = o.rawDate >= ps;
      const matchSearch  = o.token.includes(search) || o.items.toLowerCase().includes(search.toLowerCase());
      const matchSource  = source === "All" || o.source === source.toLowerCase();
      const matchStatus  = status === "All" || o.status === status;
      return matchPeriod && matchSearch && matchSource && matchStatus;
    });
  }, [rawOrders, search, source, status, period]);

  const totalRevenue    = filtered.reduce((s, o) => s + o.amount, 0);
  const counterOrders   = filtered.filter(o => o.source === "counter").length;
  const customerOrders  = filtered.filter(o => o.source === "customer").length;

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Orders</h1>
            <p className="text-xs text-[var(--muted-warm)]">{filtered.length} orders · ₹{totalRevenue.toLocaleString("en-IN")} revenue</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-warm)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Token or item…"
                className="h-9 pl-8 pr-3 text-sm bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] outline-none w-40" />
            </div>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}
              className="h-9 px-3 text-sm bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] outline-none">
              {["Today", "Week", "Month"].map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)}
              className="h-9 px-3 text-sm bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] outline-none">
              {["All", "Counter", "Customer"].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="h-9 px-3 text-sm bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] outline-none">
              {["All", "awaiting_payment", "pending", "preparing", "ready", "served", "cancelled"].map(s => (
                <option key={s} value={s}>{s === "All" ? "All Status" : s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Orders",    val: filtered.length,    color: "var(--maroon-deep)" },
              { label: "Counter Orders",  val: counterOrders,      color: "var(--pending-brand)" },
              { label: "Customer Orders", val: customerOrders,     color: "#2563EB" },
              { label: "Revenue",         val: `₹${totalRevenue.toLocaleString("en-IN")}`, color: "var(--success-brand)" },
            ].map((s) => (
              <div key={s.label} className="card-warm p-4">
                <p className="text-xs text-[var(--muted-warm)] uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.val}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="text-[var(--amber-brand)] animate-spin" />
            </div>
          ) : (
            <div className="card-warm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--gold-bg)] text-[var(--muted-warm)] text-xs uppercase tracking-wide">
                      {["Token", "Source", "Items", "Amount", "Payment", "Status", "Date", "Time"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => (
                      <tr key={o.id} className="border-t border-[var(--border-warm)] hover:bg-[var(--hover-warm)] transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[var(--maroon-deep)]">{o.token}</td>
                        <td className="px-4 py-3 text-[var(--ink)] capitalize">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.source === "counter" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                            {o.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-warm)] max-w-[200px] truncate">{o.items}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--ink)]">₹{o.amount}</td>
                        <td className="px-4 py-3 text-[var(--ink)] capitalize">{o.paymentMethod.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[o.status] ?? "bg-gray-100 text-gray-700"}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-warm)] whitespace-nowrap">{o.date}</td>
                        <td className="px-4 py-3 text-[var(--muted-warm)] whitespace-nowrap">{o.time}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-12 text-[var(--muted-warm)]">No orders match your filter</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
