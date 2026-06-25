'use client';

import { useEffect, useMemo, useState } from "react";
import { Trash2, Check, UtensilsCrossed, Clock, QrCode, Loader2, History, Minus, X } from "lucide-react";
import { Logo } from "@/components/Logo";
// mock-data removed — menu loaded from DB
import { useTokenStore } from "@/lib/store";
import { createClient } from "@/utils/supabase/client";
import QRCode from "react-qr-code";

type TokenStatus = "awaiting_payment" | "pending" | "preparing" | "ready" | "served";

type QueueOrder = {
  id: string;
  total: number;
  paymentMethod: string | null;
  mobile: string | null;
  items: { qty: number; price: number; menuItem: { name: string; category: string } }[];
};

type QueueEntry = {
  id: string;           // token UUID
  tokenNumber: number;
  status: TokenStatus;
  order: QueueOrder;
  expanded: boolean;
};

type DBMenuItem = { id: string; name: string; price: number; category: string; section: string; available: boolean; imageUrl: string | null; color?: string; veg?: boolean; popular?: boolean };

const STATUS_LABELS: Record<TokenStatus, string> = {
  awaiting_payment: "Awaiting Payment",
  pending: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

const STATUS_COLORS: Record<TokenStatus, { bg: string; text: string; border: string }> = {
  awaiting_payment: { bg: "#FFF3E0", text: "#E65100", border: "#FFB74D" },
  pending: { bg: "#FFF8EC", text: "#B36900", border: "#F5DCA0" },
  preparing: { bg: "#FFF3E0", text: "#BF360C", border: "#FF8A65" },
  ready: { bg: "var(--amber-brand)", text: "var(--maroon-deep)", border: "var(--amber-brand)" },
  served: { bg: "#EDFAF3", text: "var(--success-brand)", border: "#A7E6C0" },
};

async function updateTokenStatus(
  tokenId: string,
  status: TokenStatus,
  confirmedPaymentMethod?: string
) {
  await fetch("/api/tokens", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenId, status, confirmedPaymentMethod }),
  });
}

export default function CounterPage() {
  const [dbMenuItems, setDbMenuItems] = useState<DBMenuItem[]>([]);
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pay, setPay] = useState<"Cash" | "UPI">("Cash");
  const [note, setNote] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [issuedToken, setIssuedToken] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  const [mobileTab, setMobileTab] = useState<"menu" | "bill" | "queue">("menu");
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [historyList, setHistoryList] = useState<QueueEntry[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<QueueEntry | null>(null);
  const { nextToken, issueToken } = useTokenStore();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load menu from DB
  useEffect(() => {
    fetch("/api/menu")
      .then(r => r.json())
      .then(d => setDbMenuItems((d.items || []).filter((m: DBMenuItem) => m.section === "snacks" && m.available)))
      .catch(() => {});
  }, []);

  // Load today's queue from DB
  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((data) => {
        const tokens: QueueEntry[] = (data.tokens || []).map((t: {
          id: string;
          tokenNumber: number;
          status: string;
          order: QueueOrder;
        }) => ({
          id: t.id,
          tokenNumber: t.tokenNumber,
          status: t.status as TokenStatus,
          order: t.order,
          expanded: true,
        }));
        setQueue(tokens.filter((t) => t.status !== "served").reverse());
        setHistoryList(tokens.filter((t) => t.status === "served").reverse());
      })
      .catch(() => {})
      .finally(() => setQueueLoading(false));
  }, []);

  // Realtime updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tokens")
      .on("broadcast", { event: "token_update" }, ({ payload }) => {
        const { tokenId, status } = payload as { tokenId: string; status: TokenStatus };
        setQueue((prev) => {
          if (status === "served") {
            const entry = prev.find((t) => t.id === tokenId);
            if (entry) setHistoryList((h) => [{ ...entry, status: "served", expanded: false }, ...h.slice(0, 29)]);
            return prev.filter((t) => t.id !== tokenId);
          }
          return prev.map((t) => t.id === tokenId ? { ...t, status } : t);
        });
      })
      .on("broadcast", { event: "new_order" }, ({ payload }) => {
        fetch(`/api/tokens/${payload.tokenId}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.token) {
              const entry: QueueEntry = {
                id: d.token.id,
                tokenNumber: d.token.tokenNumber,
                status: d.token.status as TokenStatus,
                order: d.token.order,
                expanded: true,
              };
              setQueue((prev) => [entry, ...prev]);
            }
          })
          .catch(() => {});
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const CATS = useMemo(() => {
    const cats = Array.from(new Set(dbMenuItems.map(m => m.category)));
    return ["All", ...cats];
  }, [dbMenuItems]);

  const filtered = useMemo(
    () => cat === "All" ? dbMenuItems : dbMenuItems.filter((m) => m.category === cat),
    [cat, dbMenuItems]
  );

  const quickAddItems = dbMenuItems.slice(0, 6);

  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    ...dbMenuItems.find((m) => m.id === id)!,
    qty,
  })).filter(i => i.id);
  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const reduceOne = (id: string) =>
    setCart((c) => {
      const n = { ...c };
      const v = (n[id] || 0) - 1;
      if (v <= 0) delete n[id];
      else n[id] = v;
      return n;
    });

  const placeOrder = async () => {
    if (!cartItems.length) return;
    setOrderLoading(true);
    try {
      const res = await fetch("/api/orders/counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ id: i.id, qty: i.qty, price: i.price })),
          paymentMethod: pay.toLowerCase(),
          mobile: note || null,
        }),
      });
      const data = await res.json();
      const token = data.order?.tokenNumber ?? issueToken();
      setIssuedToken(token);
      setOrderPlaced(true);
    } catch {
      const token = issueToken();
      setIssuedToken(token);
      setOrderPlaced(true);
    } finally {
      setOrderLoading(false);
    }
    setTimeout(() => {
      setOrderPlaced(false);
      setCart({});
      setNote("");
      setIssuedToken(null);
    }, 3000);
  };

  const revertToQueue = async (entry: QueueEntry) => {
    setHistoryDetail(null);
    setHistoryList((prev) => prev.filter((t) => t.id !== entry.id));
    const reverted = { ...entry, status: "preparing" as TokenStatus, expanded: false };
    setQueue((prev) => [reverted, ...prev]);
    await updateTokenStatus(entry.id, "preparing");
  };

  const doStatusUpdate = async (entry: QueueEntry, newStatus: TokenStatus, pmMethod?: string) => {
    setQueue((prev) => prev.map((t) => t.id === entry.id ? { ...t, status: newStatus } : t));
    await updateTokenStatus(entry.id, newStatus, pmMethod);
  };

  const activeQueue = queue.filter((t) => t.status !== "served");
  const pendingCount = queue.filter((t) => ["awaiting_payment", "pending"].includes(t.status)).length;
  const preparingCount = queue.filter((t) => t.status === "preparing").length;
  const readyCount = queue.filter((t) => t.status === "ready").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5F0]">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="heritage-texture border-b border-white/10 px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: "var(--maroon-deep)" }}>
        <div className="flex items-center gap-3">
          <Logo variant="light" size={26} href="/dashboard" />
          <div className="hidden sm:block h-6 w-px bg-white/15" />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-[var(--gold-pale)] leading-none">Snacks Counter</p>
            <p className="text-[10px] text-[var(--gold-pale)]/50 mt-0.5">Evening Shift</p>
          </div>
        </div>

        {/* Live queue stats */}
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-400/30 rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-orange-300">{pendingCount} waiting</span>
            </div>
          )}
          {preparingCount > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/30 rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-amber-300">{preparingCount} preparing</span>
            </div>
          )}
          {readyCount > 0 && (
            <div className="flex items-center gap-1 bg-green-500/20 border border-green-400/30 rounded-lg px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-green-300">{readyCount} ready</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-right">
          <button onClick={() => setShowQR(true)} className="p-2 rounded-lg text-[var(--gold-pale)]/60 hover:text-[var(--gold-pale)] hover:bg-white/10 transition-colors" title="Show customer QR">
            <QrCode size={18} />
          </button>
          <Clock size={13} className="text-[var(--gold-pale)]/40" />
          <div>
            <p className="text-sm font-bold text-[var(--gold-pale)] leading-none">
              {now.toLocaleTimeString("en-IN")}
            </p>
            <p className="text-[10px] text-[var(--amber-brand)] mt-0.5">Evening Shift</p>
          </div>
          <a href="/dashboard" className="hidden lg:flex items-center gap-1 text-[var(--gold-pale)]/50 hover:text-[var(--gold-pale)] text-xs transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      {/* ── Quick add strip ──────────────────────────────────── */}
      <div className="bg-white border-b border-[#EDE8E0] px-5 py-2.5 flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-warm)] shrink-0">Quick Add</span>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {quickAddItems.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <button key={item.id} onClick={() => add(item.id)}
                className="shrink-0 relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95 text-left"
                style={{ background: qty > 0 ? "rgba(232,146,10,0.08)" : "#FAFAF8", borderColor: qty > 0 ? "var(--amber-brand)" : "#E2DDD6" }}
              >
                <div>
                  <p className="text-xs font-bold text-[var(--maroon-deep)] leading-none">{item.name}</p>
                  <p className="text-[10px] text-[var(--amber-brand)] font-semibold mt-0.5">₹{item.price}</p>
                </div>
                {qty > 0 && <span className="w-5 h-5 rounded-full bg-[var(--amber-brand)] text-white text-[10px] grid place-items-center font-bold shrink-0">{qty}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mobile tab bar ──────────────────────────────────── */}
      <div className="lg:hidden flex border-b border-[#EDE8E0] bg-white sticky top-0 z-10">
        {(["menu", "bill", "queue"] as const).map((t) => (
          <button key={t} onClick={() => setMobileTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize relative transition-colors ${mobileTab === t ? "text-[var(--maroon-deep)]" : "text-[var(--muted-warm)]"}`}
          >
            {mobileTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--amber-brand)]" />}
            {t === "bill" && itemCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                Bill <span className="w-5 h-5 rounded-full bg-[var(--amber-brand)] text-white text-[10px] font-bold grid place-items-center">{itemCount}</span>
              </span>
            ) : t === "queue" ? (
              <span className="inline-flex items-center gap-1.5">
                Queue {activeQueue.length > 0 && <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold grid place-items-center">{activeQueue.length}</span>}
              </span>
            ) : t === "menu" ? "Menu" : "Bill"}
          </button>
        ))}
      </div>

      {/* ── Main layout ────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px_340px] lg:overflow-hidden lg:min-h-0">

        {/* ── Left: Menu ──────────────────────────────────────── */}
        <section className={`bg-[#F8F5F0] overflow-y-auto p-4 ${mobileTab === "bill" || mobileTab === "queue" ? "hidden lg:block" : ""}`}>
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className="shrink-0 px-4 h-8 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: cat === c ? "var(--maroon-deep)" : "white",
                  color: cat === c ? "var(--gold-pale)" : "var(--muted-warm)",
                  border: `1px solid ${cat === c ? "var(--maroon-deep)" : "#E2DDD6"}`,
                  boxShadow: cat === c ? "0 2px 8px rgba(45,10,10,0.18)" : "none",
                }}
              >{c}</button>
            ))}
          </div>

          {/* 2-column product grid */}
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <button key={item.id} onClick={() => add(item.id)} disabled={!item.available}
                  className="relative bg-white border rounded-xl overflow-hidden text-left active:scale-95 transition-transform"
                  style={{
                    borderColor: qty > 0 ? "var(--amber-brand)" : "#EDE8E0",
                    boxShadow: qty > 0 ? "0 0 0 2px var(--amber-brand)" : "0 1px 4px rgba(0,0,0,0.05)",
                    opacity: item.available ? 1 : 0.4,
                  }}
                >
                  <div className="relative aspect-square bg-[var(--gold-pale)]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                    )}
                    {qty > 0 && (
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); reduceOne(item.id); }}
                          className="w-6 h-6 rounded-full bg-[var(--maroon-deep)] text-white grid place-items-center shadow">
                          <Minus size={10} />
                        </button>
                        <span className="w-6 h-6 rounded-full bg-[var(--amber-brand)] text-white text-xs font-bold grid place-items-center shadow">{qty}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-bold text-[var(--maroon-deep)] text-xs leading-snug line-clamp-2">{item.name}</p>
                    <p className="text-[var(--amber-brand)] font-bold text-xs mt-0.5">₹{item.price}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Middle: Bill panel ──────────────────────────────── */}
        <aside className={`flex-col bg-white border-l border-[#EDE8E0] lg:max-h-screen lg:sticky lg:top-0 shadow-[-4px_0_24px_rgba(0,0,0,0.04)] ${mobileTab !== "bill" ? "hidden lg:flex" : "flex"}`}>
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#F0EBE3]">
            <div>
              <h2 className="font-bold text-[var(--maroon-deep)] text-base leading-none">Current Bill</h2>
              {itemCount > 0 && <p className="text-xs text-[var(--muted-warm)] mt-0.5">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>}
            </div>
            <button onClick={() => setCart({})} className="text-[#CCC5BB] hover:text-red-400 transition-colors p-1">
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-[#F8F5F0] grid place-items-center mb-3">
                  <UtensilsCrossed size={22} className="text-[#D4C8BC]" />
                </div>
                <p className="text-sm font-medium text-[#C8BEB5]">No items yet</p>
                <p className="text-xs text-[#D4CAC1] mt-1">Tap items on the menu to add</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-[#C8BEB5] mb-2 uppercase tracking-wide font-medium">Tap row to remove one</p>
                {cartItems.map((it) => (
                  <button key={it.id} onClick={() => reduceOne(it.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-red-200 hover:bg-red-50 transition-all text-left group">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[var(--ink)] truncate group-hover:text-red-500 transition-colors">{it.name}</p>
                      <p className="text-[11px] text-[var(--muted-warm)] mt-0.5">₹{it.price} × {it.qty}</p>
                    </div>
                    <span className="font-bold text-[var(--maroon-deep)] text-sm shrink-0">₹{it.price * it.qty}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="border-t border-[#F0EBE3] p-4 space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <span className="text-sm font-semibold text-[var(--muted-warm)]">Total</span>
              <span className="text-2xl font-bold text-[var(--maroon-deep)]">₹{total}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-[#F8F5F0] rounded-xl p-1">
              {(["Cash", "UPI"] as const).map((p) => (
                <button key={p} onClick={() => setPay(p)}
                  className="h-9 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    background: pay === p ? "var(--maroon-deep)" : "transparent",
                    color: pay === p ? "var(--gold-pale)" : "var(--muted-warm)",
                    boxShadow: pay === p ? "0 2px 8px rgba(45,10,10,0.2)" : "none",
                  }}
                >{p}</button>
              ))}
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Customer name or note…"
              className="w-full h-9 px-3 rounded-lg text-sm border border-[#E8E2DA] bg-[#FAFAF8] text-[var(--ink)] placeholder:text-[#C8BEB5] focus:border-[var(--amber-brand)] focus:ring-2 focus:ring-[var(--amber-brand)]/10 outline-none transition" />
            <button
              onClick={placeOrder}
              disabled={!cartItems.length || orderLoading}
              className="w-full h-14 rounded-xl font-bold text-[15px] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: orderPlaced ? "var(--success-brand)" : "linear-gradient(135deg, var(--amber-brand) 0%, #C4821A 100%)",
                color: orderPlaced ? "#fff" : "var(--maroon-deep)",
                boxShadow: cartItems.length ? "0 4px 18px rgba(232,146,10,0.35)" : "none",
              }}
            >
              {orderPlaced ? (
                <><Check size={18} /> Token #{String(issuedToken).padStart(3, "0")} Issued!</>
              ) : orderLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : (
                `Issue Token #${String(nextToken).padStart(3, "0")}${total > 0 ? ` · ₹${total}` : ""}`
              )}
            </button>
          </div>
        </aside>

        {/* ── Right: Queue panel ───────────────────────────── */}
        <section className={`flex-col bg-[#F8F5F0] border-l border-[#EDE8E0] lg:max-h-screen lg:sticky lg:top-0 overflow-y-auto ${mobileTab !== "queue" ? "hidden lg:flex" : "flex"}`}>
          <div className="px-4 py-3 border-b border-[#EDE8E0] bg-white flex items-center justify-between">
            <h2 className="font-bold text-[var(--maroon-deep)] text-base">
              Live Queue <span className="text-[var(--muted-warm)] font-normal text-sm">({activeQueue.length})</span>
            </h2>
            <button onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs text-[var(--muted-warm)] hover:text-[var(--brown)] transition-colors">
              <History size={14} />
              History ({historyList.length})
            </button>
          </div>

          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {queueLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 size={24} className="text-[var(--amber-brand)] animate-spin" />
                <p className="text-xs text-[var(--muted-warm)]">Loading queue…</p>
              </div>
            ) : activeQueue.length === 0 ? (
              <div className="text-center py-10 text-[var(--muted-warm)]">
                <p className="text-sm font-medium">Queue is empty</p>
                <p className="text-xs mt-1">New orders appear here in real-time</p>
              </div>
            ) : (
              activeQueue.map((entry) => {
                const sc = STATUS_COLORS[entry.status];
                return (
                  <div key={entry.id} className="bg-white rounded-xl border overflow-hidden"
                    style={{ borderColor: sc.border }}>

                    {/* Token + status header */}
                    <div className="flex items-center px-3 py-2.5 gap-2" style={{ background: sc.bg }}>
                      <span className="font-display text-2xl font-bold" style={{ color: sc.text }}>
                        #{String(entry.tokenNumber).padStart(3, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: sc.text }}>
                          {STATUS_LABELS[entry.status]}
                        </p>
                        {entry.order.paymentMethod && (
                          <p className="text-[10px] text-[var(--muted-warm)] capitalize">{entry.order.paymentMethod.replace("_", " ")}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-[var(--maroon-deep)]">₹{entry.order.total}</span>
                    </div>

                    {/* Items — always visible */}
                    <div className="px-3 py-2 space-y-1 border-t border-[#F0EBE3]">
                      {entry.order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-[var(--ink)]">
                          <span className="font-semibold">{item.menuItem.name} <span className="text-[var(--muted-warm)] font-normal">×{item.qty}</span></span>
                          <span className="text-[var(--amber-brand)] font-bold">₹{item.price * item.qty}</span>
                        </div>
                      ))}
                      {entry.order.mobile && (
                        <p className="text-[10px] text-[var(--muted-warm)] pt-0.5">📱 {entry.order.mobile}</p>
                      )}
                    </div>

                    {/* Action buttons — 2 per row */}
                    <div className="px-3 py-2.5 border-t border-[#F0EBE3] flex gap-2">
                      {entry.status === "awaiting_payment" && (
                        <>
                          <button onClick={() => doStatusUpdate(entry, "pending", "cash")}
                            className="flex-1 h-9 rounded-lg text-xs font-bold bg-green-600 text-white">✓ Cash</button>
                          <button onClick={() => doStatusUpdate(entry, "pending", "upi")}
                            className="flex-1 h-9 rounded-lg text-xs font-bold bg-blue-600 text-white">📱 UPI</button>
                        </>
                      )}
                      {entry.status === "pending" && (
                        <>
                          <button onClick={() => doStatusUpdate(entry, "preparing")}
                            className="flex-1 h-9 rounded-lg text-xs font-bold text-white"
                            style={{ background: "var(--amber-brand)" }}>🔥 Prepare</button>
                          <button onClick={() => doStatusUpdate(entry, "served")}
                            className="flex-1 h-9 rounded-lg text-xs font-bold bg-[var(--success-brand)] text-white">✅ Served</button>
                        </>
                      )}
                      {entry.status === "preparing" && (
                        <>
                          <button onClick={() => doStatusUpdate(entry, "ready")}
                            className="flex-1 h-9 rounded-lg text-xs font-bold bg-green-600 text-white">✅ Ready</button>
                          <button onClick={() => doStatusUpdate(entry, "served")}
                            className="flex-1 h-9 rounded-lg text-xs font-bold bg-[var(--success-brand)] text-white">✅ Served</button>
                        </>
                      )}
                      {entry.status === "ready" && (
                        <button onClick={() => doStatusUpdate(entry, "served")}
                          className="w-full h-9 rounded-lg text-xs font-bold bg-[var(--success-brand)] text-white">🎉 Mark Served</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* History section */}
            {showHistory && historyList.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-[var(--muted-warm)] uppercase tracking-wide mb-2 px-1">
                  Served Today ({historyList.length})
                </p>
                {historyList.slice(0, 20).map((entry) => (
                  <button key={entry.id} onClick={() => setHistoryDetail(entry)}
                    className="w-full bg-white rounded-lg border border-[#E5E0D8] mb-2 opacity-70 hover:opacity-100 transition-opacity text-left">
                    <div className="flex items-center px-3 py-2 gap-2">
                      <span className="font-bold text-sm text-[var(--muted-warm)]">
                        #{String(entry.tokenNumber).padStart(3, "0")}
                      </span>
                      <span className="flex-1 text-xs text-[var(--muted-warm)] truncate">
                        {entry.order.items.map((i) => `${i.menuItem.name} ×${i.qty}`).join(" · ")}
                      </span>
                      <span className="text-xs font-semibold text-[var(--success-brand)] shrink-0">₹{entry.order.total} ✓</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── History Detail Popup ────────────────────────────── */}
      {historyDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setHistoryDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EBE3]">
              <div>
                <p className="font-display text-2xl font-bold text-[var(--maroon-deep)]">
                  #{String(historyDetail.tokenNumber).padStart(3, "0")}
                </p>
                <p className="text-xs text-[var(--success-brand)] font-semibold">✓ Served</p>
              </div>
              <button onClick={() => setHistoryDetail(null)} className="p-1 text-[var(--muted-warm)]"><X size={20} /></button>
            </div>
            <div className="px-5 py-4 space-y-2">
              {historyDetail.order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm text-[var(--ink)]">
                  <span className="font-semibold">{item.menuItem.name} <span className="text-[var(--muted-warm)] font-normal">×{item.qty}</span></span>
                  <span className="font-bold text-[var(--amber-brand)]">₹{item.price * item.qty}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-[#F0EBE3]">
                <span className="text-[var(--ink)]">Total</span>
                <span className="text-[var(--maroon-deep)]">₹{historyDetail.order.total}</span>
              </div>
              {historyDetail.order.paymentMethod && (
                <p className="text-xs text-[var(--muted-warm)] capitalize">
                  Payment: <span className="font-semibold text-[var(--ink)]">{historyDetail.order.paymentMethod.replace("_", " ")}</span>
                </p>
              )}
              {historyDetail.order.mobile && (
                <p className="text-xs text-[var(--muted-warm)]">📱 {historyDetail.order.mobile}</p>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setHistoryDetail(null)}
                className="flex-1 h-10 rounded-xl border border-[var(--border-warm)] text-sm text-[var(--muted-warm)]">Close</button>
              <button onClick={() => revertToQueue(historyDetail)}
                className="flex-1 h-10 rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--amber-brand)" }}>
                ↩ Revert to Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Code Modal ───────────────────────────────────── */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-[var(--maroon-deep)]">Customer Order QR</h3>
            <p className="text-xs text-gray-500 text-center">Customers scan this to place their own order</p>
            <div className="p-3 bg-white border-2 border-[var(--maroon-deep)] rounded-xl">
              <QRCode value={typeof window !== "undefined" ? `${window.location.origin}/order` : "/order"} size={200} />
            </div>
            <p className="text-xs text-gray-400">
              {typeof window !== "undefined" ? `${window.location.origin}/order` : "/order"}
            </p>
            <button onClick={() => setShowQR(false)}
              className="px-8 py-2.5 rounded-xl font-bold text-sm text-[var(--maroon-deep)]"
              style={{ background: "linear-gradient(135deg, var(--amber-brand) 0%, #C4821A 100%)" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
