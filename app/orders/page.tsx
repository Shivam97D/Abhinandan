'use client';

import { useEffect, useState, useMemo } from "react";
import { Search, Loader2, X, Receipt } from "lucide-react";
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
  token?: { status: string; id: string } | null;
};

type DisplayOrder = {
  id: string;
  tokenNumber: number | null;
  token: string;
  source: string;
  items: { name: string; qty: number; price: number }[];
  itemSummary: string;
  amount: number;
  paymentMethod: string;
  status: string;
  date: string;
  time: string;
  rawDate: Date;
  createdAt: string;
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

function paymentLabel(method: string, source: string) {
  const m = (method || "").toLowerCase();
  if (m === "cash" || m === "counter_cash") return "Counter — Cash";
  if (m === "upi" && source === "counter")  return "Counter — UPI";
  if (m === "upi")                           return "App — UPI";
  if (m === "counter_pending")              return "Counter (Pending)";
  return method.replace(/_/g, " ");
}

function billRef(id: string) {
  return `ABH-${id.slice(-8).toUpperCase()}`;
}

function periodStart(p: Period): Date {
  const now = new Date();
  if (p === "Today") return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  if (p === "Week") { const d = new Date(now); d.setDate(d.getDate() - 6); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
}

// ── Bill Modal ──────────────────────────────────────────────────────────────
function BillModal({ order, onClose }: { order: DisplayOrder; onClose: () => void }) {
  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const isCounter = order.source === "counter" || order.paymentMethod.toLowerCase().includes("counter");
  const pLabel = paymentLabel(order.paymentMethod, order.source);
  const itemsTotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-auto shadow-2xl rounded-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-white/20 text-white grid place-items-center hover:bg-white/30 transition-colors"
        >
          <X size={14} />
        </button>

        {/* Header: source colour */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: isCounter ? "#E8920A" : "#4A1414" }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/70 leading-none mb-0.5">
              {isCounter ? "Counter Order" : "Customer App Order"}
            </p>
            <p className="text-white text-sm font-bold">Nyahari Tea & Snacks Centre</p>
            <p className="text-white/60 text-[10px] mt-0.5">Pune, Maharashtra</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Token</p>
            <p className="font-bold text-white leading-none" style={{ fontSize: "2.4rem", fontFamily: "serif" }}>
              {order.token}
            </p>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-dashed border-[#E8D5C4] bg-[#FBF5EC]">
          <div>
            <p className="text-[9px] text-[#9C7A6A] uppercase tracking-widest">Bill No.</p>
            <p className="text-xs font-mono font-bold text-[#4A1414]">{billRef(order.id)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-[#9C7A6A] uppercase tracking-widest">Date & Time</p>
            <p className="text-xs font-semibold text-[#4A1414]">{dateStr} · {timeStr}</p>
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white px-5 pt-3 pb-1">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-1 mb-1.5 pb-1.5 border-b border-[#E8D5C4]">
            <p className="col-span-5 text-[9px] text-[#9C7A6A] uppercase tracking-widest font-semibold">Item</p>
            <p className="col-span-2 text-[9px] text-[#9C7A6A] uppercase tracking-widest font-semibold text-center">Qty</p>
            <p className="col-span-2 text-[9px] text-[#9C7A6A] uppercase tracking-widest font-semibold text-right">Rate</p>
            <p className="col-span-3 text-[9px] text-[#9C7A6A] uppercase tracking-widest font-semibold text-right">Amount</p>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 py-1.5 border-b border-[#F2E6D9] last:border-none">
              <p className="col-span-5 text-xs font-semibold text-[#2D0A0A] leading-tight">{item.name}</p>
              <p className="col-span-2 text-xs text-[#6B4F3A] text-center">{item.qty}</p>
              <p className="col-span-2 text-xs text-[#6B4F3A] text-right">₹{item.price}</p>
              <p className="col-span-3 text-xs font-bold text-[#2D0A0A] text-right">₹{item.price * item.qty}</p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div
          className="mx-4 mt-2 rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: isCounter ? "#FFF3DC" : "#F9F0F0" }}
        >
          <p className="text-sm font-bold text-[#4A1414]">Total Amount</p>
          <p className="text-xl font-bold" style={{ color: isCounter ? "#E8920A" : "#4A1414", fontFamily: "serif" }}>
            ₹{order.amount}
          </p>
        </div>

        {/* Payment + Status */}
        <div className="px-4 py-3 bg-white space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-[#E8D5C4] bg-[#FBF5EC] px-3 py-2">
            <div>
              <p className="text-[9px] text-[#9C7A6A] uppercase tracking-widest">Payment</p>
              <p className="text-xs font-bold text-[#2D0A0A]">{pLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[#9C7A6A] uppercase tracking-widest">Status</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                {order.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Source badge */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              order.source === "counter" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {order.source === "counter" ? "Counter Order" : "Customer App"}
            </span>
            {itemsTotal !== order.amount && (
              <p className="text-[10px] text-[#9C7A6A]">Subtotal ₹{itemsTotal}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 bg-white text-center border-t border-dashed border-[#E8D5C4] pt-3">
          <p className="text-[10px] text-[#9C7A6A]">Thank you for ordering! 🙏</p>
          <p className="text-[9px] text-[#C4A882] mt-0.5">Nyahari Tea & Snacks Centre · Pune, Maharashtra</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [rawOrders, setRawOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [source, setSource]       = useState("All");
  const [status, setStatus]       = useState("All");
  const [period, setPeriod]       = useState<Period>("Today");
  const [viewOrder, setViewOrder] = useState<DisplayOrder | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/orders")
      .then(r => r.json())
      .then(d => {
        const orders: RawOrder[] = d.orders || [];
        setRawOrders(orders.map(o => ({
          id: o.id,
          tokenNumber: o.tokenNumber,
          token: o.tokenNumber ? `#${String(o.tokenNumber).padStart(3, "0")}` : "—",
          source: o.source,
          items: o.items.map(i => ({ name: i.menuItem.name, qty: i.qty, price: i.price })),
          itemSummary: o.items.map(i => `${i.menuItem.name} ×${i.qty}`).join(", "),
          amount: Math.round(o.total),
          paymentMethod: o.paymentMethod || "pending",
          status: o.token?.status ?? o.status,
          date: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          time: new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          rawDate: new Date(o.createdAt),
          createdAt: o.createdAt,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const ps = periodStart(period);
    return rawOrders.filter(o => {
      const matchPeriod  = o.rawDate >= ps;
      const matchSearch  = o.token.includes(search) || o.itemSummary.toLowerCase().includes(search.toLowerCase());
      const matchSource  = source === "All" || o.source === source.toLowerCase();
      const matchStatus  = status === "All" || o.status === status;
      return matchPeriod && matchSearch && matchSource && matchStatus;
    });
  }, [rawOrders, search, source, status, period]);

  const totalRevenue   = filtered.reduce((s, o) => s + o.amount, 0);
  const counterOrders  = filtered.filter(o => o.source === "counter").length;
  const customerOrders = filtered.filter(o => o.source === "customer").length;

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="pl-10 lg:pl-0">
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
          {/* KPI row */}
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
                      {["Bill / Token", "Source", "Items", "Amount", "Payment", "Status", "Date", "Time", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => (
                      <tr
                        key={o.id}
                        className="border-t border-[var(--border-warm)] hover:bg-[var(--hover-warm)] transition-colors cursor-pointer"
                        onClick={() => setViewOrder(o)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-[var(--maroon-deep)]">{o.token}</p>
                          <p className="text-[10px] text-[var(--muted-warm)] font-mono">{billRef(o.id)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.source === "counter" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                            {o.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-warm)] max-w-[180px] truncate">{o.itemSummary}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--ink)]">₹{o.amount}</td>
                        <td className="px-4 py-3 text-[var(--ink)] text-xs">{paymentLabel(o.paymentMethod, o.source)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[o.status] ?? "bg-gray-100 text-gray-700"}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-warm)] whitespace-nowrap">{o.date}</td>
                        <td className="px-4 py-3 text-[var(--muted-warm)] whitespace-nowrap">{o.time}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewOrder(o); }}
                            className="p-1.5 rounded-lg text-[var(--amber-brand)] hover:bg-[var(--hover-warm)] transition-colors"
                            title="View Bill"
                          >
                            <Receipt size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-12 text-[var(--muted-warm)]">No orders match your filter</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />

      {/* Bill modal */}
      {viewOrder && <BillModal order={viewOrder} onClose={() => setViewOrder(null)} />}
    </div>
  );
}
