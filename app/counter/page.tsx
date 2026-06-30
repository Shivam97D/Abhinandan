'use client';

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Trash2, Check, UtensilsCrossed, Clock, QrCode, Loader2, History, Minus, X, Bell, Settings, Printer } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTokenStore } from "@/lib/store";
import { createClient } from "@/utils/supabase/client";
import QRCode from "react-qr-code";

function playSynthSound(type: string) {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "ding-dong") {
      // First tone (Ding)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Second tone (Dong)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.7);
    } else if (type === "high-chime") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1100, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "tri-tone") {
      const tones = [523.25, 659.25, 783.99];
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.15, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    }
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}

type TokenStatus = "awaiting_payment" | "pending" | "preparing" | "ready" | "served";

type QueueOrder = {
  id: string;
  total: number;
  paymentMethod: string | null;
  mobile: string | null;
  items: { qty: number; price: number; menuItem: { name: string; category: string } }[];
};

type QueueEntry = {
  id: string;
  tokenNumber: number;
  status: TokenStatus;
  order: QueueOrder;
  expanded: boolean;
};

type OrderNotification = {
  id: string;
  tokenNumber: number;
  total: number;
  status: string;
  timestamp: Date;
};

type DBMenuItem = {
  id: string; name: string; price: number; category: string;
  section: string; available: boolean; imageUrl: string | null;
};

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

async function updateTokenStatus(tokenId: string, status: TokenStatus, confirmedPaymentMethod?: string) {
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
  const [pay, setPay] = useState<"Cash" | "UPI">("UPI");
  const [showSoundPopup, setShowSoundPopup] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  
  const [paidSound, setPaidSound] = useState<"ding-dong" | "high-chime" | "tri-tone">("ding-dong");
  const [unpaidSound, setUnpaidSound] = useState<"ding-dong" | "high-chime" | "tri-tone">("tri-tone");

  useEffect(() => {
    const savedPaid = localStorage.getItem("counter-paid-sound");
    if (savedPaid && ["ding-dong", "high-chime", "tri-tone"].includes(savedPaid)) {
      setPaidSound(savedPaid as "ding-dong" | "high-chime" | "tri-tone");
    }
    const savedUnpaid = localStorage.getItem("counter-unpaid-sound");
    if (savedUnpaid && ["ding-dong", "high-chime", "tri-tone"].includes(savedUnpaid)) {
      setUnpaidSound(savedUnpaid as "ding-dong" | "high-chime" | "tri-tone");
    }
  }, []);

  const changePaidSound = (type: "ding-dong" | "high-chime" | "tri-tone") => {
    setPaidSound(type);
    localStorage.setItem("counter-paid-sound", type);
    playSynthSound(type);
  };

  const changeUnpaidSound = (type: "ding-dong" | "high-chime" | "tri-tone") => {
    setUnpaidSound(type);
    localStorage.setItem("counter-unpaid-sound", type);
    playSynthSound(type);
  };
  const [note, setNote] = useState("");
  // Receipt print toggle — default true, synced from localStorage AFTER hydration
  const [printReceipt, setPrintReceipt] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("counter-print-receipt");
    if (saved !== null) setPrintReceipt(saved === "true");
  }, []);

  // UPI settings fetched from DB settings
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("Nyahari Tea & Snacks");
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.settings?.upiId) setUpiId(d.settings.upiId);
        if (d.settings?.upiMerchantName) setUpiName(d.settings.upiMerchantName);
      })
      .catch(() => {});
  }, []);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [issuedToken, setIssuedToken] = useState<number | null>(null);
  const [now, setNow] = useState<Date | null>(null);
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
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadMenu = () => {
    fetch(`/api/menu?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => setDbMenuItems((d.items || []).filter((m: DBMenuItem) => m.section === "snacks" && m.available)))
      .catch(() => {});
  };

  useEffect(() => {
    loadMenu();

    const supabase = createClient();
    const channel = supabase
      .channel("menu")
      .on("broadcast", { event: "menu_update" }, () => {
        loadMenu();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetch("/api/tokens")
      .then(r => r.json())
      .then(data => {
        const tokens: QueueEntry[] = (data.tokens || []).map((t: {
          id: string; tokenNumber: number; status: string; order: QueueOrder;
        }) => ({ id: t.id, tokenNumber: t.tokenNumber, status: t.status as TokenStatus, order: t.order, expanded: true }));
        setQueue(tokens.filter(t => t.status !== "served").reverse());
        setHistoryList(tokens.filter(t => t.status === "served").reverse());
      })
      .catch(() => {})
      .finally(() => setQueueLoading(false));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tokens")
      .on("broadcast", { event: "token_update" }, ({ payload }) => {
        const { tokenId, status } = payload as { tokenId: string; status: TokenStatus };
        setQueue(prev => {
          if (status === "served") {
            const entry = prev.find(t => t.id === tokenId);
            if (entry) setHistoryList(h => [{ ...entry, status: "served", expanded: false }, ...h.slice(0, 29)]);
            return prev.filter(t => t.id !== tokenId);
          }
          return prev.map(t => t.id === tokenId ? { ...t, status } : t);
        });
      })
      .on("broadcast", { event: "new_order" }, ({ payload }) => {
        const status = payload.status || "pending";
        if (status === "awaiting_payment") {
          const savedUnpaid = localStorage.getItem("counter-unpaid-sound") || "tri-tone";
          playSynthSound(savedUnpaid);
        } else {
          const savedPaid = localStorage.getItem("counter-paid-sound") || "ding-dong";
          playSynthSound(savedPaid);
        }

        // Add to notifications list
        const newNotif: OrderNotification = {
          id: payload.tokenId,
          tokenNumber: payload.tokenNumber || 0,
          total: payload.total || 0,
          status: status,
          timestamp: new Date(),
        };
        setNotifications(prev => [newNotif, ...prev]);

        fetch(`/api/tokens/${payload.tokenId}`)
          .then(r => r.json())
          .then(d => {
            if (d.token) {
              const entry: QueueEntry = {
                id: d.token.id, tokenNumber: d.token.tokenNumber,
                status: d.token.status as TokenStatus, order: d.token.order, expanded: true,
              };
              setQueue(prev => [entry, ...prev]);
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
    () => cat === "All" ? dbMenuItems : dbMenuItems.filter(m => m.category === cat),
    [cat, dbMenuItems]
  );

  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    ...dbMenuItems.find(m => m.id === id)!,
    qty,
  })).filter(i => i.id);
  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const add = (id: string) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const reduceOne = (id: string) => setCart(c => {
    const n = { ...c };
    const v = (n[id] || 0) - 1;
    if (v <= 0) delete n[id]; else n[id] = v;
    return n;
  });

  // ─── Print bill function ──────────────────────────────────────────────────
  const printBill = (opts: {
    tokenNumber: number;
    items: { name: string; qty: number; price: number }[];
    total: number;
    paymentMethod: string;
    note: string;
    orderId?: string;
  }) => {
    const { tokenNumber, items, total, paymentMethod, note: cNote, orderId } = opts;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    const billRef = orderId ? `ABH-${orderId.slice(-8).toUpperCase()}` : `ABH-CTR-${String(tokenNumber).padStart(4, "0")}`;
    const payLabel = paymentMethod === "cash" ? "Counter Cash" : paymentMethod === "upi" ? "Counter UPI" : paymentMethod;

    const rows = items.map(it =>
      `<tr>
        <td style="padding:2px 0;font-size:11px">${it.name}</td>
        <td style="text-align:center;font-size:11px">${it.qty}</td>
        <td style="text-align:right;font-size:11px">₹${it.price}</td>
        <td style="text-align:right;font-size:11px;font-weight:700">₹${it.price * it.qty}</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Bill #${tokenNumber} — Nyahari</title>
<style>
  /* Thermal receipt CSS — works for 58mm and 80mm printers */
  @page { margin: 0; size: 80mm auto; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    color: #000;
    background: #fff;
    width: 76mm;
    padding: 4mm 3mm;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .shop-name { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 1mm; }
  .shop-sub { font-size: 10px; color: #333; }
  .divider { border: none; border-top: 1px dashed #000; margin: 3mm 0; }
  .divider-solid { border: none; border-top: 2px solid #000; margin: 2mm 0; }
  .token-row { display: flex; justify-content: space-between; align-items: center; margin: 2mm 0; }
  .token-num { font-size: 28px; font-weight: 900; font-family: serif; }
  .bill-meta { font-size: 9px; color: #444; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #000; padding: 1mm 0; }
  td { vertical-align: top; padding: 1.5mm 0; }
  .total-row { font-size: 14px; font-weight: 900; display: flex; justify-content: space-between; margin: 2mm 0; }
  .pay-badge { font-size: 10px; background: #000; color: #fff; padding: 1mm 3mm; border-radius: 2mm; display: inline-block; margin-top: 1mm; }
  .footer { font-size: 9px; color: #555; margin-top: 3mm; }
  .live-time { font-size: 9px; font-family: monospace; }
  @media print { body { width: 100%; } }
</style>
</head>
<body>
  <div class="center">
    <div class="shop-name">न्याहारी</div>
    <div class="shop-sub">Tea & Snacks Centre</div>
    <div class="shop-sub">Pune, Maharashtra</div>
  </div>
  <hr class="divider-solid" />

  <div class="token-row">
    <div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px">Show at Counter</div>
      <div class="bill-meta">Bill No: <b>${billRef}</b></div>
      <div class="bill-meta">${dateStr} · ${timeStr}</div>
      ${cNote ? `<div class="bill-meta">Note: <b>${cNote}</b></div>` : ""}
    </div>
    <div class="center">
      <div style="font-size:9px">TOKEN</div>
      <div class="token-num">#${String(tokenNumber).padStart(3, "0")}</div>
    </div>
  </div>

  <hr class="divider" />

  <table>
    <thead>
      <tr>
        <th style="text-align:left;width:50%">Item</th>
        <th style="text-align:center;width:12%">Qty</th>
        <th style="text-align:right;width:19%">Rate</th>
        <th style="text-align:right;width:19%">Amt</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <hr class="divider-solid" />

  <div class="total-row">
    <span>TOTAL</span>
    <span>₹${total}</span>
  </div>

  <div class="center">
    <span class="pay-badge">✓ ${payLabel.toUpperCase()}</span>
  </div>

  <hr class="divider" />
  <div class="center footer">
    <div>Thank you for visiting!</div>
    <div>FSSAI: 12424999000040 | GST: Pending</div>
    <div class="live-time">Printed: ${timeStr}</div>
  </div>
</body>
</html>`;

    try {
      const win = window.open("", "_blank", "width=400,height=600,scrollbars=yes");
      if (!win) {
        // Popup blocked — fallback: create a blob URL and open it
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }
      win.document.write(html);
      win.document.close();
      // Wait for fonts/layout then auto-print
      win.onload = () => {
        setTimeout(() => {
          win.focus();
          win.print();
          // Close after print dialog dismissed (delay for mobile)
          setTimeout(() => win.close(), 1500);
        }, 250);
      };
      // Fallback if onload doesn't fire (some browsers)
      setTimeout(() => {
        if (!win.closed) {
          win.focus();
          win.print();
        }
      }, 800);
    } catch (err) {
      console.error("Print error:", err);
    }
  };

  const placeOrder = async () => {
    if (!cartItems.length) return;
    setOrderLoading(true);
    // Capture snapshot for printing before state resets
    const printSnapshot = {
      items: cartItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      total,
      paymentMethod: pay.toLowerCase(),
      note,
    };
    // Counter UPI → awaiting_payment so staff shows QR & confirms
    const apiPaymentMethod = pay === "UPI" ? "counter_upi_pending" : pay.toLowerCase();
    try {
      const res = await fetch("/api/orders/counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map(i => ({ id: i.id, qty: i.qty, price: i.price })),
          paymentMethod: apiPaymentMethod,
          mobile: note || null,
        }),
      });
      const data = await res.json();
      const token = data.order?.tokenNumber ?? issueToken();
      setIssuedToken(token);
      setOrderPlaced(true);
      // Auto-print if toggle is ON
      if (printReceipt) {
        printBill({ ...printSnapshot, tokenNumber: token, orderId: data.order?.id });
      }
    } catch {
      const token = issueToken();
      setIssuedToken(token);
      setOrderPlaced(true);
      if (printReceipt) {
        printBill({ ...printSnapshot, tokenNumber: token });
      }
    } finally {
      setOrderLoading(false);
    }
    setTimeout(() => {
      setOrderPlaced(false);
      setCart({});
      setNote("");
      setIssuedToken(null);
      setPay("UPI");
    }, 3000);
  };

  const revertToQueue = async (entry: QueueEntry) => {
    setHistoryDetail(null);
    setHistoryList(prev => prev.filter(t => t.id !== entry.id));
    const reverted = { ...entry, status: "preparing" as TokenStatus, expanded: false };
    setQueue(prev => [reverted, ...prev]);
    await updateTokenStatus(entry.id, "preparing");
  };

  const doStatusUpdate = async (entry: QueueEntry, newStatus: TokenStatus, pmMethod?: string) => {
    setQueue(prev => prev.map(t => t.id === entry.id ? { ...t, status: newStatus } : t));
    await updateTokenStatus(entry.id, newStatus, pmMethod);
  };

  const activeQueue = queue.filter(t => t.status !== "served");
  const pendingCount = queue.filter(t => ["awaiting_payment", "pending"].includes(t.status)).length;
  const preparingCount = queue.filter(t => t.status === "preparing").length;
  const readyCount = queue.filter(t => t.status === "ready").length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F8F5F0]">

      {/* ── Top bar ── */}
      <header className="heritage-texture border-b border-white/10 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0"
        style={{ background: "var(--maroon-deep)" }}>
        <div className="flex items-center gap-3">
          <Logo variant="light" size={24} href="/dashboard" />
          <div className="hidden sm:block h-5 w-px bg-white/15" />
          <div className="hidden sm:block">
            <p className="text-[11px] font-semibold text-[var(--gold-pale)] leading-none">Snacks Counter</p>
            <p className="text-[10px] text-[var(--gold-pale)] opacity-60 mt-0.5">Evening Shift</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-400/30 rounded-lg px-2 py-1">
              <span className="text-[10px] font-bold text-orange-300">{pendingCount} waiting</span>
            </div>
          )}
          {preparingCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 bg-amber-500/20 border border-amber-400/30 rounded-lg px-2 py-1">
              <span className="text-[10px] font-bold text-amber-300">{preparingCount} prep</span>
            </div>
          )}
          {readyCount > 0 && (
            <div className="flex items-center gap-1 bg-green-500/20 border border-green-400/30 rounded-lg px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-green-300">{readyCount} ready</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="p-1.5 rounded-lg text-[var(--gold-pale)] opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors relative"
            title="Notifications">
            <Bell size={16} />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full grid place-items-center animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>
          <button onClick={() => setShowQR(true)}
            className="p-1.5 rounded-lg text-[var(--gold-pale)] opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
            title="Customer QR">
            <QrCode size={16} />
          </button>
          <div className="hidden sm:flex items-center gap-1.5">
            <Clock size={12} className="text-[var(--gold-pale)] opacity-50" />
            <p className="text-sm font-bold text-[var(--gold-pale)] leading-none tabular-nums">
              {now ? now.toLocaleTimeString("en-IN") : "--:--:--"}
            </p>
          </div>
          <a href="/serving"
            className="hidden lg:flex items-center gap-1 text-[var(--gold-pale)] opacity-70 hover:opacity-100 text-xs transition-colors ml-2 mr-2">
            👨‍🍳 Serving
          </a>
          <a href="/dashboard"
            className="hidden lg:flex items-center gap-1 text-[var(--gold-pale)] opacity-70 hover:opacity-100 text-xs transition-colors ml-2">
            ← Dashboard
          </a>
        </div>
      </header>

      {/* ── Mobile tab bar ── */}
      <div className="lg:hidden flex border-b border-[#EDE8E0] bg-white shrink-0 z-10">
        {(["menu", "bill", "queue"] as const).map(t => (
          <button key={t} onClick={() => setMobileTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize relative transition-colors ${
              mobileTab === t ? "text-[var(--maroon-deep)]" : "text-[var(--muted-warm)]"
            }`}
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
        <a href="/serving"
          className="flex-1 py-3 text-sm font-semibold text-[var(--muted-warm)] transition-colors text-center flex items-center justify-center gap-1 border-b-2 border-transparent hover:bg-gray-50/50"
        >
          👨‍🍳 Serving
        </a>
      </div>

      {/* ── Main layout ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px_300px]">

        {/* ── Left: Menu (scrollable) ── */}
        <section className={`bg-[#F8F5F0] overflow-y-auto p-3 ${
          mobileTab === "bill" || mobileTab === "queue" ? "hidden lg:block" : ""
        }`}>
          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className="shrink-0 px-3 h-7 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: cat === c ? "var(--maroon-deep)" : "white",
                  color: cat === c ? "var(--gold-pale)" : "var(--muted-warm)",
                  border: `1px solid ${cat === c ? "var(--maroon-deep)" : "#E2DDD6"}`,
                  boxShadow: cat === c ? "0 2px 8px rgba(45,10,10,0.18)" : "none",
                }}
              >{c}</button>
            ))}
          </div>

          {/* 2-col mobile / 3-col desktop product grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item, idx) => {
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
                  {/* Proportional aspect-ratio based image area */}
                  <div className="relative w-full aspect-[16/10] bg-[var(--gold-pale)]">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover"
                        sizes="(min-width: 1024px) 33vw, 50vw" priority={idx < 6}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                    )}
                    {qty > 0 && (
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                        <button onClick={e => { e.stopPropagation(); reduceOne(item.id); }}
                          className="w-6 h-6 rounded-full bg-[var(--maroon-deep)] text-white grid place-items-center shadow">
                          <Minus size={10} />
                        </button>
                        <span className="w-6 h-6 rounded-full bg-[var(--amber-brand)] text-white text-[11px] font-bold grid place-items-center shadow">{qty}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="font-bold text-[var(--maroon-deep)] text-xs leading-tight line-clamp-1">{item.name}</p>
                    <p className="text-[var(--amber-brand)] font-bold text-xs mt-0.5">₹{item.price}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Middle: Bill panel (fixed height, button always visible) ── */}
        <aside className={`flex flex-col bg-white border-l border-[#EDE8E0] overflow-hidden shadow-[-4px_0_24px_rgba(0,0,0,0.04)] ${
          mobileTab !== "bill" ? "hidden lg:flex" : "flex"
        }`}>
          {/* Bill header */}
          <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-[#F0EBE3]">
            <div>
              <h2 className="font-bold text-[var(--maroon-deep)] text-sm leading-none">Current Bill</h2>
              {itemCount > 0 && <p className="text-[11px] text-[var(--muted-warm)] mt-0.5">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>}
            </div>
            <button onClick={() => setCart({})} className="text-[#CCC5BB] hover:text-red-400 transition-colors p-1">
              <Trash2 size={14} />
            </button>
          </div>

          {/* Bill items — scrollable middle area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-1">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#F8F5F0] grid place-items-center mb-3">
                  <UtensilsCrossed size={20} className="text-[#D4C8BC]" />
                </div>
                <p className="text-sm font-medium text-[#C8BEB5]">No items yet</p>
                <p className="text-xs text-[#D4CAC1] mt-1">Tap items on the menu to add</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-[#C8BEB5] mb-2 uppercase tracking-wide font-medium">Tap row to remove one</p>
                {cartItems.map(it => (
                  <button key={it.id} onClick={() => reduceOne(it.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent hover:border-red-200 hover:bg-red-50 transition-all text-left group">
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

          {/* Bill footer — always visible, never pushed off screen */}
          <div className="shrink-0 border-t border-[#F0EBE3] p-4 space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <span className="text-sm font-semibold text-[var(--muted-warm)]">Total</span>
              <span className="text-2xl font-bold text-[var(--maroon-deep)]">₹{total}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-[#F8F5F0] rounded-xl p-1">
              {(["Cash", "UPI"] as const).map(p => (
                <button key={p} onClick={() => setPay(p)}
                  className="h-9 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    background: pay === p ? "var(--maroon-deep)" : "transparent",
                    color: pay === p ? "var(--gold-pale)" : "var(--muted-warm)",
                    boxShadow: pay === p ? "0 2px 8px rgba(45,10,10,0.2)" : "none",
                  }}
                >{p === "Cash" ? "💵 Cash" : "📱 UPI"}</button>
              ))}
            </div>
            {/* Note + Receipt toggle — same row, half/half */}
            <div className="flex gap-2">
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="Name / note…"
                className="flex-1 min-w-0 h-9 px-3 rounded-lg text-sm border border-[#E8E2DA] bg-[#FAFAF8] text-[var(--ink)] placeholder:text-[#C8BEB5] focus:border-[var(--amber-brand)] focus:ring-2 focus:ring-[var(--amber-brand)]/10 outline-none transition" />
              {/* Receipt print toggle */}
              <button
                onClick={() => {
                  const next = !printReceipt;
                  setPrintReceipt(next);
                  localStorage.setItem("counter-print-receipt", String(next));
                }}
                title={printReceipt ? "Receipt printing ON — click to disable" : "Receipt printing OFF — click to enable"}
                className="shrink-0 h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all"
                style={{
                  background: printReceipt ? "var(--maroon-deep)" : "#F0EBE3",
                  color: printReceipt ? "var(--gold-pale)" : "#C8BEB5",
                  borderColor: printReceipt ? "var(--maroon-deep)" : "#E2DDD6",
                  boxShadow: printReceipt ? "0 2px 8px rgba(45,10,10,0.2)" : "none",
                }}
              >
                <Printer size={13} />
                <span className="hidden sm:inline">{printReceipt ? "ON" : "OFF"}</span>
              </button>
            </div>

            {/* Issue token button */}
            <button
              onClick={placeOrder}
              disabled={!cartItems.length || orderLoading}
              className="w-full h-12 rounded-xl font-bold text-[14px] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: orderPlaced ? "var(--success-brand)" : "linear-gradient(135deg, var(--amber-brand) 0%, #C4821A 100%)",
                color: orderPlaced ? "#fff" : "var(--maroon-deep)",
                boxShadow: cartItems.length ? "0 4px 18px rgba(232,146,10,0.35)" : "none",
              }}
            >
              {orderPlaced ? (
                <><Check size={16} /> Token #{String(issuedToken).padStart(3, "0")} Issued!{printReceipt ? " 🖨️" : ""}</>
              ) : orderLoading ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                <span className="flex items-center gap-2">
                  {printReceipt && <Printer size={14} />}
                  Issue Token #{String(nextToken).padStart(3, "0")}{total > 0 ? ` · ₹${total}` : ""}
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* ── Right: Queue panel ── */}
        <section className={`flex flex-col bg-[#F8F5F0] border-l border-[#EDE8E0] overflow-hidden ${
          mobileTab !== "queue" ? "hidden lg:flex" : "flex"
        }`}>
          {/* Queue header */}
          <div className="shrink-0 px-4 py-3 border-b border-[#EDE8E0] bg-white flex items-center justify-between">
            <h2 className="font-bold text-[var(--maroon-deep)] text-sm">
              Live Queue <span className="text-[var(--muted-warm)] font-normal text-xs">({activeQueue.length})</span>
            </h2>
            <button onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs text-[var(--muted-warm)] hover:text-[var(--brown)] transition-colors">
              <History size={13} />
              History ({historyList.length})
            </button>
          </div>

          {/* Queue content — scrollable */}
          <div className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto">
            {queueLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 size={22} className="text-[var(--amber-brand)] animate-spin" />
                <p className="text-xs text-[var(--muted-warm)]">Loading queue…</p>
              </div>
            ) : activeQueue.length === 0 ? (
              <div className="text-center py-10 text-[var(--muted-warm)]">
                <p className="text-sm font-medium">Queue is empty</p>
                <p className="text-xs mt-1">New orders appear here in real-time</p>
              </div>
            ) : (
              activeQueue.map(entry => {
                const sc = STATUS_COLORS[entry.status];
                return (
                  <div key={entry.id} className="bg-white rounded-xl border overflow-hidden"
                    style={{ borderColor: sc.border }}>
                    <div className="flex items-center px-3 py-2 gap-2" style={{ background: sc.bg }}>
                      <span className="font-display text-xl font-bold" style={{ color: sc.text }}>
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

                    <div className="px-3 py-1.5 space-y-0.5 border-t border-[#F0EBE3]">
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

                    <div className="px-3 py-2 border-t border-[#F0EBE3] flex gap-1.5">
                      {entry.status === "awaiting_payment" && (
                        entry.order.paymentMethod === "upi" && upiId ? (
                          // UPI payment — show QR for customer to scan
                          <div className="w-full">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">📱 Scan & Pay ₹{entry.order.total}</span>
                              <span className="text-[10px] text-[var(--muted-warm)]">{upiName}</span>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="bg-white border-2 border-blue-500 rounded-lg p-1.5 shrink-0">
                                <QRCode
                                  value={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${entry.order.total}&cu=INR&tn=${encodeURIComponent(`Token #${entry.tokenNumber} Nyahari`)}`}
                                  size={72}
                                />
                              </div>
                              <div className="flex-1 flex flex-col gap-1.5">
                                <p className="text-[9px] text-[var(--muted-warm)]">
                                  UPI ID: <span className="font-mono font-bold text-[var(--ink)]">{upiId}</span>
                                </p>
                                <button
                                  onClick={() => doStatusUpdate(entry, "pending", "upi")}
                                  className="w-full h-9 rounded-lg text-xs font-bold bg-blue-600 text-white flex items-center justify-center gap-1"
                                >
                                  ✓ UPI Received
                                </button>
                                <button
                                  onClick={() => doStatusUpdate(entry, "pending", "cash")}
                                  className="w-full h-7 rounded-lg text-[10px] font-semibold bg-green-600 text-white"
                                >
                                  💵 Paid Cash Instead
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Cash / no-UPI flow
                          <>
                            <button onClick={() => doStatusUpdate(entry, "pending", "cash")}
                              className="flex-1 h-8 rounded-lg text-xs font-bold bg-green-600 text-white">💵 Cash</button>
                            <button onClick={() => doStatusUpdate(entry, "pending", "upi")}
                              className="flex-1 h-8 rounded-lg text-xs font-bold bg-blue-600 text-white">📱 UPI</button>
                          </>
                        )
                      )}

                      {entry.status === "pending" && (
                        <>
                          <button onClick={() => doStatusUpdate(entry, "preparing")}
                            className="flex-1 h-8 rounded-lg text-xs font-bold text-white"
                            style={{ background: "var(--amber-brand)" }}>🔥 Prepare</button>
                          <button onClick={() => doStatusUpdate(entry, "served")}
                            className="flex-1 h-8 rounded-lg text-xs font-bold bg-[var(--success-brand)] text-white">✅ Served</button>
                        </>
                      )}
                      {entry.status === "preparing" && (
                        <>
                          <button onClick={() => doStatusUpdate(entry, "ready")}
                            className="flex-1 h-8 rounded-lg text-xs font-bold bg-green-600 text-white">✅ Ready</button>
                          <button onClick={() => doStatusUpdate(entry, "served")}
                            className="flex-1 h-8 rounded-lg text-xs font-bold bg-[var(--success-brand)] text-white">✅ Served</button>
                        </>
                      )}
                      {entry.status === "ready" && (
                        <button onClick={() => doStatusUpdate(entry, "served")}
                          className="w-full h-8 rounded-lg text-xs font-bold bg-[var(--success-brand)] text-white">🎉 Mark Served</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {showHistory && historyList.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold text-[var(--muted-warm)] uppercase tracking-wide mb-2 px-1">
                  Served Today ({historyList.length})
                </p>
                {historyList.slice(0, 20).map(entry => (
                  <button key={entry.id} onClick={() => setHistoryDetail(entry)}
                    className="w-full bg-white rounded-lg border border-[#E5E0D8] mb-2 opacity-70 hover:opacity-100 transition-opacity text-left">
                    <div className="flex items-center px-3 py-2 gap-2">
                      <span className="font-bold text-sm text-[var(--muted-warm)]">
                        #{String(entry.tokenNumber).padStart(3, "0")}
                      </span>
                      <span className="flex-1 text-xs text-[var(--muted-warm)] truncate">
                        {entry.order.items.map(i => `${i.menuItem.name} ×${i.qty}`).join(" · ")}
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

      {/* ── History Detail Popup ── */}
      {historyDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setHistoryDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
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
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setHistoryDetail(null)}
                className="flex-1 h-10 rounded-xl border border-[var(--border-warm)] text-sm text-[var(--muted-warm)]">Close</button>
              <button
                onClick={() => printBill({
                  tokenNumber: historyDetail.tokenNumber,
                  items: historyDetail.order.items.map(i => ({
                    name: i.menuItem.name, qty: i.qty, price: i.price,
                  })),
                  total: historyDetail.order.total,
                  paymentMethod: historyDetail.order.paymentMethod || "cash",
                  note: historyDetail.order.mobile || "",
                  orderId: historyDetail.order.id,
                })}
                className="h-10 px-3 rounded-xl text-sm font-bold text-white flex items-center gap-1.5"
                style={{ background: "#374151" }}
              >
                <Printer size={13} /> Reprint
              </button>
              <button onClick={() => revertToQueue(historyDetail)}
                className="flex-1 h-10 rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--amber-brand)" }}>
                ↩ Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Code Modal ── */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-[var(--maroon-deep)]">Customer Order QR</h3>
            <p className="text-xs text-gray-500 text-center">Customers scan this to place their own order</p>
            <div className="p-3 bg-white border-2 border-[var(--maroon-deep)] rounded-xl">
              <QRCode value={typeof window !== "undefined" ? `${window.location.origin}/order` : "/order"} size={180} />
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

      {/* ── Notification Panel Dropdown ── */}
      {showNotifPanel && (
        <div className="absolute right-4 top-14 z-50 w-80 bg-white rounded-2xl border border-[#EDE8E0] shadow-2xl overflow-hidden flex flex-col max-h-[380px]">
          <div className="shrink-0 px-4 py-3 bg-[#F8F5F0] border-b border-[#EDE8E0] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[var(--maroon-deep)]">Notifications</span>
              {notifications.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--amber-brand)] text-white text-[9px] font-bold">
                  {notifications.length} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => { setShowSoundPopup(true); setShowNotifPanel(false); }} 
                className="p-1 hover:bg-[#EDE8E0] rounded text-[var(--muted-warm)] transition flex items-center justify-center" 
                title="Notification Sound Settings"
              >
                <Settings size={14} />
              </button>
              <button 
                onClick={() => setShowNotifPanel(false)} 
                className="p-1 hover:bg-[#EDE8E0] rounded text-[var(--muted-warm)] transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#EDE8E0] scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--muted-warm)]">
                <p className="font-medium">No new notifications</p>
                <p className="text-[10px] opacity-70 mt-0.5">Incoming orders will appear here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 hover:bg-[#FAFAF8] transition flex items-start gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[var(--maroon-deep)]">
                        Token #{String(n.tokenNumber).padStart(3, "0")}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        n.status === "awaiting_payment" 
                          ? "bg-orange-50 text-orange-700 border border-orange-200" 
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}>
                        {n.status === "awaiting_payment" ? "Unpaid Bill" : "Paid Order"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted-warm)] mt-1">
                      Total: <span className="font-bold text-[var(--maroon-deep)]">₹{n.total}</span>
                    </p>
                    <p className="text-[9px] text-[var(--muted-warm)]/70 mt-0.5">
                      {new Date(n.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                  <button 
                    onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                    className="p-1 text-[var(--muted-warm)] hover:text-red-500 rounded hover:bg-red-50 transition" 
                    title="Dismiss"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <button 
              onClick={() => setNotifications([])} 
              className="shrink-0 w-full py-2 bg-[#F8F5F0] border-t border-[#EDE8E0] text-center text-xs font-semibold text-[var(--maroon-deep)] hover:bg-[#EDE8E0] transition"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* ── Sound Chooser Modal ── */}
      {showSoundPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSoundPopup(false)}>
          <div className="bg-white rounded-2xl p-6 flex flex-col gap-4 shadow-2xl mx-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base text-[var(--maroon-deep)] flex items-center gap-2">
              <Settings size={18} className="text-[var(--amber-brand)]" />
              Notification Sound Settings
            </h3>
            <p className="text-xs text-gray-500">Choose separate sounds for paid orders and unpaid bills:</p>
            
            <div className="space-y-4 my-2">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-[var(--maroon-deep)] uppercase tracking-wide">🟢 Paid Order Sound</p>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    { id: "ding-dong", label: "🔔 Ding-Dong Bell" },
                    { id: "high-chime", label: "🔔 Sharp Chime" },
                    { id: "tri-tone", label: "🔔 Tri-Tone Alert" },
                  ] as const).map(opt => (
                    <div key={opt.id} className="flex items-center justify-between p-2 rounded-xl border border-[#EDE8E0] hover:bg-[#F8F5F0] transition">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 text-xs font-semibold text-[var(--ink)]">
                        <input type="radio" name="paid-sound-opt" checked={paidSound === opt.id} onChange={() => changePaidSound(opt.id)} className="accent-[var(--amber-brand)]" />
                        {opt.label}
                      </label>
                      <button onClick={() => playSynthSound(opt.id)} className="p-1 hover:bg-white rounded border border-[#EDE8E0] text-[var(--amber-brand)] transition" title="Preview sound">
                        ▶️
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-[var(--maroon-deep)] uppercase tracking-wide">🟠 Unpaid Bill Sound</p>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    { id: "ding-dong", label: "🔔 Ding-Dong Bell" },
                    { id: "high-chime", label: "🔔 Sharp Chime" },
                    { id: "tri-tone", label: "🔔 Tri-Tone Alert" },
                  ] as const).map(opt => (
                    <div key={opt.id} className="flex items-center justify-between p-2 rounded-xl border border-[#EDE8E0] hover:bg-[#F8F5F0] transition">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 text-xs font-semibold text-[var(--ink)]">
                        <input type="radio" name="unpaid-sound-opt" checked={unpaidSound === opt.id} onChange={() => changeUnpaidSound(opt.id)} className="accent-[var(--amber-brand)]" />
                        {opt.label}
                      </label>
                      <button onClick={() => playSynthSound(opt.id)} className="p-1 hover:bg-white rounded border border-[#EDE8E0] text-[var(--amber-brand)] transition" title="Preview sound">
                        ▶️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setShowSoundPopup(false)}
              className="mt-2 w-full py-2.5 rounded-xl font-bold text-sm text-[var(--maroon-deep)]"
              style={{ background: "linear-gradient(135deg, var(--amber-brand) 0%, #C4821A 100%)" }}>
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
