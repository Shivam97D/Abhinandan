'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { Plus, Minus, ShoppingCart, X, Menu, Clock, Loader2 } from "lucide-react";
import { Logo, TeaCupIcon } from "@/components/Logo";
import { useCartStore, useOrderStore } from "@/lib/store";
import { getOrCreateSessionId } from "@/lib/session";

type MenuItemAPI = {
  id: string;
  name: string;
  price: number;
  category: string;
  section: string;
  available: boolean;
  imageUrl?: string;
};

type PastOrder = {
  id: string;
  total: number;
  createdAt: string;
  paymentMethod: string | null;
  tokenNumber: number | null;
  token?: { status: string; id: string } | null;
  items: { qty: number; price: number; menuItem: { name: string } }[];
};

export default function OrderPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemAPI[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [cat, setCat] = useState("All");
  const [mobile, setMobile] = useState("");
  const [step, setStep] = useState<"menu" | "review" | "placing">("menu");
  const [showHistory, setShowHistory] = useState(false);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { cart, addItem, removeItem, getItems, getTotal, getCount, clearCart } = useCartStore();
  const { setOrder } = useOrderStore();

  const loadMenu = (silent: unknown = false) => {
    const isSilent = silent === true;
    if (!isSilent) setMenuLoading(true);
    setMenuError(null);
    fetch(`/api/menu?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!d.items || d.items.length === 0) throw new Error("No menu items found");
        setMenuItems(d.items);
      })
      .catch((e: Error) => setMenuError(e.message))
      .finally(() => {
        if (!isSilent) setMenuLoading(false);
      });
  };

  useEffect(() => { setMounted(true); }, []);
  // Load menu from DB
  useEffect(() => {
    loadMenu();

    const supabase = createClient();
    const channel = supabase
      .channel("menu")
      .on("broadcast", { event: "menu_update" }, () => {
        loadMenu(true); // Load silently in the background
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic categories from DB
  const CATS = useMemo(() => {
    const cats = Array.from(new Set(menuItems.filter((m) => m.available).map((m) => m.category)));
    return ["All", ...cats];
  }, [menuItems]);

  const filtered = useMemo(
    () =>
      cat === "All"
        ? menuItems.filter((m) => m.available)
        : menuItems.filter((m) => m.available && m.category === cat),
    [cat, menuItems]
  );

  const popular = useMemo(() => menuItems.filter((m) => m.available).slice(0, 4), [menuItems]);

  const cartItems = getItems(menuItems);
  const total = getTotal(menuItems);
  const count = getCount();

  const loadHistory = async () => {
    const sid = getOrCreateSessionId();
    if (!sid) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/orders/session/${sid}`);
      const data = await res.json();
      setPastOrders(data.orders || []);
    } catch {}
    setHistoryLoading(false);
  };

  const openHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  // Place order — counter pay path: create order immediately, redirect to token page
  const placeCounterOrder = async () => {
    if (!cartItems.length) return;
    setStep("placing");
    const sid = getOrCreateSessionId();
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ id: i.id, qty: i.qty, price: i.price })),
          source: "customer",
          paymentMethod: "counter_pending",
          mobile: mobile || undefined,
          sessionId: sid,
        }),
      });
      const data = await res.json();
      const { tokenNumber, tokenId, id: orderId } = data.order;
      setOrder({
        tokenNumber,
        tokenId: tokenId || "",
        orderId,
        items: cartItems,
        total,
        paymentMethod: "counter_pending",
        status: "awaiting_payment",
      });
      clearCart();
      router.push(`/order/token?token=${tokenNumber}&orderId=${orderId}&method=counter`);
    } catch {
      setStep("review");
      alert("Failed to place order. Please try again.");
    }
  };

  // Place order — UPI pay path: create order, then show UPI demo screen
  const placeUPIOrder = async () => {
    if (!cartItems.length) return;
    setStep("placing");
    const sid = getOrCreateSessionId();
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ id: i.id, qty: i.qty, price: i.price })),
          source: "customer",
          paymentMethod: "upi",
          mobile: mobile || undefined,
          sessionId: sid,
        }),
      });
      const data = await res.json();
      const { tokenNumber, tokenId, id: orderId } = data.order;
      setOrder({
        tokenNumber,
        tokenId: tokenId || "",
        orderId,
        items: cartItems,
        total,
        paymentMethod: "upi",
        status: "pending",
      });
      clearCart();
      router.push(`/order/token?token=${tokenNumber}&orderId=${orderId}&method=upi`);
    } catch {
      setStep("review");
      alert("Failed to place order. Please try again.");
    }
  };

  // ── Placing (loading) screen
  if (step === "placing") {
    return (
      <div className="min-h-screen bg-[var(--gold-bg)] flex flex-col items-center justify-center gap-4">
        <TeaCupIcon className="w-14 h-14 text-[var(--amber-brand)] animate-pulse" />
        <p className="text-[var(--maroon-deep)] font-semibold">Placing your order…</p>
      </div>
    );
  }

  // ── Review screen
  if (step === "review") {
    return (
      <div className="min-h-screen bg-[var(--gold-bg)] flex flex-col max-w-lg mx-auto">
        <header className="sticky top-0 z-20 bg-[var(--gold-bg)]/95 backdrop-blur border-b border-[var(--border-warm)] px-4 py-3 flex items-center gap-3">
          <button onClick={() => setStep("menu")} className="text-[var(--brown)] text-sm hover:underline flex items-center gap-1">
            ← Menu
          </button>
          <Logo size={22} />
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-[30vh] scrollbar-none">
          <h2 className="font-display text-2xl text-[var(--maroon-deep)]">Review Order</h2>

          <div className="card-warm divide-y divide-[var(--border-warm)]">
            {cartItems.map((it) => (
              <div key={it.id} className="flex items-center gap-3 py-3 px-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--ink)] truncate">{it.name}</p>
                  <p className="text-xs text-[var(--muted-warm)]">₹{it.price} × {it.qty}</p>
                </div>
                <div className="flex items-center gap-0.5 border border-[var(--border-warm)] rounded-lg overflow-hidden">
                  <button onClick={() => removeItem(it.id)} className="w-8 h-8 grid place-items-center text-[var(--brown)] hover:bg-[var(--hover-warm)]">
                    <Minus size={12} />
                  </button>
                  <span className="w-7 text-center font-bold text-sm text-[var(--ink)]">{it.qty}</span>
                  <button onClick={() => addItem(it.id)} className="w-8 h-8 grid place-items-center text-[var(--brown)] hover:bg-[var(--hover-warm)]">
                    <Plus size={12} />
                  </button>
                </div>
                <span className="font-bold text-[var(--maroon-deep)] text-sm w-14 text-right">₹{it.price * it.qty}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-lg px-4 py-4">
              <span className="text-[var(--ink)]">Total</span>
              <span className="font-display text-[var(--maroon-deep)]">₹{total}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1 uppercase tracking-wide">
              Mobile (optional — for SMS token alert)
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              inputMode="numeric"
              className="w-full h-12 px-4 bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none transition"
            />
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-[var(--muted-warm)] uppercase tracking-wide">How would you like to pay?</p>

            {/* UPI Pay */}
            <button
              onClick={placeUPIOrder}
              disabled={!cartItems.length}
              className="w-full h-16 rounded-xl font-bold text-base flex items-center justify-between px-5 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #1a6b3a 0%, #145c30 100%)",
                color: "white",
                boxShadow: "0 4px 18px rgba(26,107,58,0.35)",
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                Pay via UPI
              </span>
              <span className="opacity-80 text-sm">₹{total} →</span>
            </button>

            {/* Counter Pay */}
            <button
              onClick={placeCounterOrder}
              disabled={!cartItems.length}
              className="w-full h-16 rounded-xl font-bold text-base flex items-center justify-between px-5 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, var(--amber-brand) 0%, #C4821A 100%)",
                color: "var(--maroon-deep)",
                boxShadow: "0 4px 18px rgba(232,146,10,0.35)",
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">💵</span>
                Pay at Counter
              </span>
              <span className="opacity-70 text-sm">₹{total} →</span>
            </button>
          </div>

          <p className="text-center text-xs text-[var(--muted-warm)]">
            No login required · Your token is generated instantly
          </p>
        </div>
      </div>
    );
  }

  // ── Menu screen (default)
  return (
    <div className="min-h-screen bg-[var(--gold-bg)] max-w-lg mx-auto relative pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--gold-bg)]/95 backdrop-blur border-b border-[var(--border-warm)] px-4 py-3 flex items-center justify-between">
        <Logo size={24} />
        <div className="flex items-center gap-2">
          <button
            onClick={openHistory}
            className="p-2 rounded-lg text-[var(--muted-warm)] hover:text-[var(--brown)] hover:bg-[var(--hover-warm)] transition-colors"
            title="Order History"
          >
            <Menu size={20} />
          </button>
          <button onClick={() => mounted && count > 0 && setStep("review")} className="relative p-2">
            <ShoppingCart size={22} className="text-[var(--maroon-deep)]" strokeWidth={1.75} />
            {mounted && count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--amber-brand)] text-white text-[11px] font-bold rounded-full grid place-items-center">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Popular strip */}
      {popular.length > 0 && (
        <div className="border-b border-[var(--border-warm)] bg-[var(--gold-pale)]/30 px-4 py-3">
          <p className="text-sm font-bold text-[var(--maroon-deep)] mb-2">🔥 Popular Right Now</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {popular.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="shrink-0 bg-white border border-[var(--border-warm)] rounded-xl px-3 py-2.5 flex items-center gap-3"
                  style={{ minWidth: 155 }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--maroon-deep)] text-sm leading-none truncate">{item.name}</p>
                    <p className="text-[var(--amber-brand)] font-bold text-sm mt-0.5">₹{item.price}</p>
                  </div>
                  {qty > 0 ? (
                    <div className="flex items-center gap-0.5 bg-[var(--maroon-deep)] text-[var(--gold-pale)] rounded-full px-0.5">
                      <button onClick={() => removeItem(item.id)} className="w-7 h-7 grid place-items-center"><Minus size={11} /></button>
                      <span className="text-xs font-bold w-4 text-center">{qty}</span>
                      <button onClick={() => addItem(item.id)} className="w-7 h-7 grid place-items-center"><Plus size={11} /></button>
                    </div>
                  ) : (
                    <button onClick={() => addItem(item.id)}
                      className="w-8 h-8 rounded-full bg-[var(--amber-brand)] text-white grid place-items-center active:scale-95 transition-transform">
                      <Plus size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="sticky top-[57px] z-10 bg-[var(--gold-bg)]/95 backdrop-blur border-b border-[var(--border-warm)] py-2">
        <div className="flex gap-2 overflow-x-auto px-4 scrollbar-none">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className="shrink-0 px-4 h-9 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: cat === c ? "var(--maroon-deep)" : "var(--gold-pale)",
                color: cat === c ? "var(--gold-pale)" : "var(--maroon-deep)",
              }}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      {menuLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="text-[var(--amber-brand)] animate-spin" />
          <p className="text-sm text-[var(--muted-warm)]">Loading menu…</p>
        </div>
      ) : menuError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
          <TeaCupIcon className="w-12 h-12 text-[var(--muted-warm)] opacity-40" />
          <p className="text-sm font-semibold text-[var(--maroon-deep)]">Could not load menu</p>
          <p className="text-xs text-[var(--muted-warm)]">{menuError}</p>
          <button onClick={loadMenu}
            className="px-5 h-10 rounded-xl btn-amber text-sm font-semibold">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 py-3">
          {filtered.map((item, idx) => {
            const qty = cart[item.id] || 0;
            return (
              <div
                key={item.id}
                onClick={() => addItem(item.id)}
                className="bg-white border border-[var(--border-warm)] rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform select-none"
                style={{ boxShadow: qty > 0 ? "0 0 0 2px var(--amber-brand)" : undefined }}
              >
                {/* Image area */}
                <div className="relative aspect-square bg-[var(--gold-pale)]">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 512px) 50vw, 256px"
                      priority={idx < 4}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🍽️
                    </div>
                  )}

                  {/* Qty badge + minus */}
                  {qty > 0 && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        className="w-7 h-7 rounded-full bg-[var(--maroon-deep)] text-[var(--gold-pale)] grid place-items-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="min-w-[26px] h-7 rounded-full bg-[var(--amber-brand)] text-white text-xs font-bold grid place-items-center px-1">
                        {qty}
                      </span>
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="p-2.5">
                  <p className="font-bold text-[var(--maroon-deep)] text-sm leading-snug line-clamp-2">{item.name}</p>
                  <p className="text-[var(--amber-brand)] font-bold text-sm mt-1">₹{item.price}</p>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-2 text-center text-sm text-[var(--muted-warm)] py-10">No items in this category</p>
          )}
        </div>
      )}

      {/* Floating cart */}
      {mounted && count > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-20">
          <button
            onClick={() => setStep("review")}
            className="w-full h-14 rounded-xl flex items-center justify-between px-5 text-white font-semibold"
            style={{ background: "var(--maroon-deep)", boxShadow: "0 8px 32px rgba(45,10,10,0.35)" }}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={18} /> {count} item{count !== 1 ? "s" : ""}
            </span>
            <span style={{ color: "#F5D79E" }}>Review & Pay ₹{total} →</span>
          </button>
        </div>
      )}

      {/* History sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistory(false)} />
          <div className="relative ml-auto w-80 max-w-full h-full bg-[var(--gold-bg)] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-warm)]">
              <h3 className="font-display text-lg text-[var(--maroon-deep)]">Order History</h3>
              <button onClick={() => setShowHistory(false)} className="p-1 text-[var(--muted-warm)] hover:text-[var(--brown)]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 size={24} className="text-[var(--amber-brand)] animate-spin" />
                  <p className="text-xs text-[var(--muted-warm)]">Loading history…</p>
                </div>
              ) : pastOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={32} className="text-[var(--border-warm)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--muted-warm)]">No past orders yet</p>
                  <p className="text-xs text-[var(--muted-warm)]/60 mt-1">Orders on this device appear here</p>
                </div>
              ) : (
                pastOrders.map((order) => {
                  const tokenStatus = order.token?.status || "";
                  const statusBadge = tokenStatus === "served" ? "bg-green-100 text-green-700"
                    : tokenStatus === "ready" ? "bg-amber-100 text-amber-700"
                    : tokenStatus === "preparing" ? "bg-red-100 text-red-700"
                    : "bg-[var(--gold-pale)] text-[var(--pending-brand)]";
                  const billUrl = order.tokenNumber
                    ? `/order/token?token=${order.tokenNumber}&orderId=${order.id}&method=${order.paymentMethod === 'counter_pending' ? 'counter' : 'upi'}`
                    : null;
                  return (
                    <button
                      key={order.id}
                      onClick={() => { if (billUrl) { setShowHistory(false); window.location.href = billUrl; } }}
                      className="card-warm p-3 w-full text-left hover:shadow-md active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-[var(--maroon-deep)] font-mono">#{order.tokenNumber || "—"}</span>
                          {tokenStatus && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${statusBadge}`}>
                              {tokenStatus.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-[var(--amber-brand)]">₹{order.total}</span>
                      </div>
                      {/* Date */}
                      <p className="text-[10px] text-[var(--muted-warm)] mb-1.5">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        {" · "}
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                      {/* Itemized */}
                      <div className="space-y-0.5 border-t border-[var(--border-warm)] pt-1.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-[var(--ink)]">{item.menuItem.name} ×{item.qty}</span>
                            <span className="font-semibold text-[var(--maroon-deep)]">₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                      {billUrl && (
                        <p className="text-[10px] text-[var(--amber-brand)] mt-2 font-semibold">Tap to view bill →</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
