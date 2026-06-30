'use client';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Share2, Loader2, Flame, Sparkles, CheckCircle2, Check, Clock } from "lucide-react";
import { Logo, TeaCupIcon } from "@/components/Logo";
import { createClient } from "@/utils/supabase/client";
import QRCode from "react-qr-code";


// ─── Live clock hook ──────────────────────────────────────────────────────────
function useLiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}


// ─── Audio ────────────────────────────────────────────────────────────────────
function playSynthSound(type: string) {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    if (type === "smooth-served") {
      const osc1 = ctx.createOscillator(), gain1 = ctx.createGain();
      osc1.type = "sine"; osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.15, now); gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc1.connect(gain1); gain1.connect(ctx.destination); osc1.start(now); osc1.stop(now + 0.6);
      const osc2 = ctx.createOscillator(), gain2 = ctx.createGain();
      osc2.type = "sine"; osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0.15, now + 0.08); gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc2.connect(gain2); gain2.connect(ctx.destination); osc2.start(now + 0.08); osc2.stop(now + 0.7);
    }
  } catch (e) { console.error("Audio error:", e); }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderItem = { qty: number; price: number; menuItem: { name: string } };
type TokenData = {
  id: string;
  tokenNumber: number;
  status: string;
  createdAt?: string;
  order: {
    id: string;
    total: number;
    paymentMethod: string | null;
    createdAt?: string;
    items: OrderItem[];
  };
};

// ─── Payment label helper ─────────────────────────────────────────────────────
function paymentLabel(method: string | null | undefined, source?: string): { label: string; badge: string } {
  const m = (method || "").toLowerCase();
  if (m === "cash" || m === "counter_cash") return { label: "Counter — Cash Paid ✓", badge: "bg-green-50 text-green-700 border-green-200" };
  if (m === "upi" && source === "counter")  return { label: "Counter — UPI Paid ✓",  badge: "bg-green-50 text-green-700 border-green-200" };
  if (m === "upi")                           return { label: "App — UPI Paid ✓",      badge: "bg-blue-50 text-blue-700 border-blue-200" };
  if (m === "counter_pending")              return { label: "Pay at Counter",         badge: "bg-orange-50 text-orange-700 border-orange-200" };
  return { label: "Payment Pending",         badge: "bg-gray-50 text-gray-600 border-gray-200" };
}

// ─── Status config (hero + badge) ───────────────────────────────────────────
type StatusCfg = {
  dot: string;
  label: string;
  banner: string;
  heroTitle: string;
  heroDesc: string;
  heroBg: string;
  heroIconEl: React.ReactNode;
};

const STATUS_CFG: Record<string, StatusCfg> = {
  awaiting_payment: {
    dot: "bg-orange-400",
    label: "Awaiting Payment",
    banner: "border-orange-300 bg-orange-50 text-orange-700",
    heroTitle: "Show This at the Counter!",
    heroDesc: "Your order is placed. Walk to the counter, show this token and pay there.",
    heroBg: "bg-orange-50",
    heroIconEl: <div className="w-20 h-20 rounded-full bg-orange-100 grid place-items-center"><span className="text-4xl">🧾</span></div>,
  },
  pending: {
    dot: "bg-green-400",
    label: "Order Confirmed",
    banner: "border-green-300 bg-green-50 text-green-700",
    heroTitle: "Order Confirmed!",
    heroDesc: "Paid! Your order is in the queue. We'll start preparing it shortly.",
    heroBg: "bg-green-50",
    heroIconEl: <div className="w-20 h-20 rounded-full bg-green-100 grid place-items-center"><CheckCircle2 size={52} className="text-[var(--success-brand)]" /></div>,
  },
  preparing: {
    dot: "bg-red-400 animate-pulse",
    label: "Being Prepared",
    banner: "border-red-300 bg-red-50 text-red-700",
    heroTitle: "Preparing Your Order!",
    heroDesc: "Our kitchen is making your delicious snacks right now.",
    heroBg: "bg-red-50",
    heroIconEl: <div className="w-20 h-20 rounded-full bg-red-100 grid place-items-center"><Flame size={52} className="text-red-500 animate-pulse" /></div>,
  },
  ready: {
    dot: "bg-amber-400 animate-bounce",
    label: "Ready for Pickup! 🎉",
    banner: "border-amber-300 bg-amber-50 text-amber-700",
    heroTitle: "Ready — Come Collect! 🎉",
    heroDesc: "Your order is ready at the counter. Please collect it now!",
    heroBg: "bg-amber-50",
    heroIconEl: <div className="w-20 h-20 rounded-full bg-amber-100 grid place-items-center animate-bounce"><Sparkles size={52} className="text-[var(--amber-brand)]" /></div>,
  },
  served: {
    dot: "bg-gray-400",
    label: "Served",
    banner: "border-gray-300 bg-gray-50 text-gray-600",
    heroTitle: "Order Served!",
    heroDesc: "Enjoy your food. Thank you for ordering from Nyahari! 🙏",
    heroBg: "bg-gray-50",
    heroIconEl: <div className="w-20 h-20 rounded-full bg-gray-100 grid place-items-center"><Check size={40} className="text-gray-500" /></div>,
  },
};

function statusIcon(s: string) {
  if (s === "preparing") return <Flame size={18} className="text-red-500 animate-pulse" />;
  if (s === "ready")     return <Sparkles size={18} className="text-amber-500" />;
  if (s === "served")    return <Check size={18} className="text-gray-500" />;
  if (s === "pending")   return <CheckCircle2 size={18} className="text-green-600" />;
  return <Clock size={18} className="text-orange-500" />;
}

// ─── Bill ref number ──────────────────────────────────────────────────────────
function billRef(orderId: string) {
  return `ABH-${orderId.slice(-8).toUpperCase()}`;
}

// ─── The Bill Card (shared by page and print) ─────────────────────────────────
function BillCard({
  tokenNumber, tokenData, currentStatus, isCounter, isServed,
}: {
  tokenNumber: string;
  tokenData: TokenData | null;
  currentStatus: string;
  isCounter: boolean;
  isServed: boolean;
}) {
  const cfg = STATUS_CFG[currentStatus] || STATUS_CFG.pending;
  const items = tokenData?.order.items || [];
  const total = tokenData?.order.total || 0;
  const orderId = tokenData?.order.id || "";
  const createdAt = tokenData?.order.createdAt || tokenData?.createdAt;
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const timeStr = createdAt
    ? new Date(createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "—";
  const pay = paymentLabel(tokenData?.order.paymentMethod, isCounter ? "counter" : "app");
  const liveClock = useLiveClock();

  return (
    <div
      id="bill-card"
      className={`w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-lg transition-all duration-500 ${
        isServed ? "opacity-40 grayscale pointer-events-none" : ""
      }`}
      style={{ border: `2px solid ${isCounter ? "#E8920A" : "#4A1414"}`, background: "#fff" }}
    >
      {/* ── Bill header strip: label + token number ── */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: isCounter ? "#E8920A" : "#4A1414" }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/70 leading-none mb-0.5">
            {isCounter ? "Pay at Counter" : "Show to Counter Staff"}
          </p>
          <p className="text-white text-xs font-semibold">Nyahari Tea & Snacks Centre</p>
        </div>
        <div className="text-right">
          {/* Live ticking clock — proves bill is live, not a screenshot */}
          {liveClock && (
            <p className="text-[11px] font-mono font-bold text-white/85 mb-1 tabular-nums">
              🕐 {liveClock}
            </p>
          )}
          <p className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Token</p>
          <p
            className="font-bold leading-none"
            style={{ fontSize: "2.6rem", fontFamily: "serif", color: "white" }}
          >
            #{tokenNumber}
          </p>
        </div>
      </div>

      {/* ── Bill meta row: ref no, date, time ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-dashed border-[#E8D5C4] bg-[#FBF5EC]">
        <div>
          <p className="text-[9px] text-[#9C7A6A] uppercase tracking-widest">Bill No.</p>
          <p className="text-xs font-mono font-bold text-[#4A1414]">{orderId ? billRef(orderId) : "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-[#9C7A6A] uppercase tracking-widest">Date & Time</p>
          <p className="text-xs font-semibold text-[#4A1414]">{dateStr} · {timeStr}</p>
        </div>
      </div>

      {/* ── Items table ── */}
      <div className="px-5 pt-3 pb-1">
        {/* header row */}
        <div className="grid grid-cols-12 gap-1 mb-1 pb-1.5 border-b border-[#E8D5C4]">
          <p className="col-span-5 text-[9px] text-[#9C7A6A] uppercase tracking-widest font-semibold">Item</p>
          <p className="col-span-2 text-[9px] text-[#9C7A6A] uppercase tracking-widest font-semibold text-center">Qty</p>
          <p className="col-span-2 text-[9px] text-[#9C7A6A] uppercase tracking-widest font-semibold text-right">Rate</p>
          <p className="col-span-3 text-[9px] text-[#9C7A6A] uppercase tracking-widest font-semibold text-right">Amount</p>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-[#9C7A6A] py-2 text-center">Order placed</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 py-1.5 border-b border-[#F2E6D9] last:border-none">
              <p className="col-span-5 text-xs font-semibold text-[#2D0A0A] leading-tight">{item.menuItem.name}</p>
              <p className="col-span-2 text-xs text-[#6B4F3A] text-center">{item.qty}</p>
              <p className="col-span-2 text-xs text-[#6B4F3A] text-right">₹{item.price}</p>
              <p className="col-span-3 text-xs font-bold text-[#2D0A0A] text-right">₹{item.price * item.qty}</p>
            </div>
          ))
        )}
      </div>

      {/* ── Total row ── */}
      <div
        className="mx-4 mt-1 mb-3 rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: isCounter ? "#FFF3DC" : "#F9F0F0" }}
      >
        <p className="text-sm font-bold text-[#4A1414]">Total Amount</p>
        <p className="text-xl font-bold" style={{ color: isCounter ? "#E8920A" : "#4A1414", fontFamily: "serif" }}>
          ₹{total}
        </p>
      </div>

      {/* ── Payment status ── */}
      <div className="px-4 pb-3">
        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${pay.badge}`}>
          <p className="text-xs font-bold">{pay.label}</p>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.banner}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 pb-4 pt-1 text-center">
        <div className="border-t border-dashed border-[#E8D5C4] pt-3">
          <p className="text-[10px] text-[#9C7A6A]">Thank you for visiting Nyahari! 🙏</p>
          <p className="text-[9px] text-[#C4A882] mt-0.5">Pune, Maharashtra · nyahari.in</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function TokenContent() {
  const searchParams = useSearchParams();
  const tokenNumber = searchParams.get("token") || "—";
  const orderId     = searchParams.get("orderId") || "";
  const method      = searchParams.get("method") || "upi";

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState<string>("");
  const [sharing, setSharing]     = useState(false);

  // UPI configuration loader
  const [upiSettings, setUpiSettings] = useState<{ upiId: string; upiMerchantName: string } | null>(null);
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setUpiSettings({
            upiId: d.settings.upiId || "",
            upiMerchantName: d.settings.upiMerchantName || "Nyahari Tea & Snacks",
          });
        }
      })
      .catch(() => {});
  }, []);

  // Loud repeating ringtone engine for Ready stage
  const [isRinging, setIsRinging] = useState(false);
  const [ringInterval, setRingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const startRinging = () => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      const playBeep = () => {
        const now = ctx.currentTime;
        // C5 Tone
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // E5 Tone
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, now + 0.08);
        gain2.gain.setValueAtTime(0.18, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.7);
      };

      playBeep();
      const intervalId = setInterval(playBeep, 1600);
      setRingInterval(intervalId);
      setIsRinging(true);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  const stopRinging = () => {
    if (ringInterval) {
      clearInterval(ringInterval);
      setRingInterval(null);
    }
    setIsRinging(false);
  };

  useEffect(() => {
    return () => {
      if (ringInterval) clearInterval(ringInterval);
    };
  }, [ringInterval]);

  useEffect(() => {
    if (!tokenNumber || tokenNumber === "—") { setLoading(false); return; }
    fetch(`/api/tokens/by-number/${tokenNumber}`)
      .then((r) => r.json())
      .then((d) => { if (d.token) { setTokenData(d.token); setStatus(d.token.status); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tokenNumber]);

  // Realtime status updates
  useEffect(() => {
    if (!tokenData?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel("tokens")
      .on("broadcast", { event: "token_update" }, ({ payload }) => {
        if (payload.tokenId === tokenData.id) {
          setStatus((prev) => {
            if (payload.status === "ready" && prev !== "ready") {
              startRinging();
            } else if (payload.status === "served") {
              stopRinging();
              if (prev !== "served") {
                playSynthSound("smooth-served");
              }
            }
            return payload.status;
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tokenData?.id, ringInterval]); // Include ringInterval to avoid stale closures in broadcast listener

  // Automatically silence/stop ringing if state transitions to served
  useEffect(() => {
    if (status === "served") {
      stopRinging();
    }
  }, [status, ringInterval]);


  const isCounter     = method === "counter";
  const currentStatus = status || (isCounter ? "awaiting_payment" : "pending");
  const isServed      = currentStatus === "served";

  // Dynamic override for customer paying via UPI awaiting verification
  const isUpiAwaiting = (method === "upi" || tokenData?.order.paymentMethod === "upi") && currentStatus === "awaiting_payment";
  
  const baseCfg = STATUS_CFG[currentStatus] || STATUS_CFG.pending;
  const cfg = isUpiAwaiting ? {
    dot: "bg-blue-400 animate-pulse",
    label: "Awaiting Confirmation",
    banner: "border-blue-300 bg-blue-50 text-blue-700",
    heroTitle: "Complete UPI Payment",
    heroDesc: "Please scan the QR code below or tap to pay with your mobile UPI app, then wait for confirmation.",
    heroBg: "bg-blue-50/50",
    heroIconEl: <div className="w-20 h-20 rounded-full bg-blue-100 grid place-items-center"><span className="text-4xl">📱</span></div>,
  } : baseCfg;

  // Auto redirect to UPI app on load (only once per order session)
  useEffect(() => {
    if (isUpiAwaiting && tokenData) {
      const sessionKey = `upi-redirected-${tokenData.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        const fallbackUpi = upiSettings?.upiId || "abhinandan@upi";
        const fallbackName = upiSettings?.upiMerchantName || "Nyahari Tea & Snacks";
        const upiUrl = `upi://pay?pa=${encodeURIComponent(fallbackUpi)}&pn=${encodeURIComponent(fallbackName)}&am=${tokenData.order.total}&cu=INR&tn=${encodeURIComponent(`Token #${tokenNumber} Nyahari`)}`;
        window.location.href = upiUrl;
      }
    }
  }, [isUpiAwaiting, upiSettings, tokenData, tokenNumber]);

  const merchantUpi = upiSettings?.upiId || "abhinandan@upi";
  const merchantName = upiSettings?.upiMerchantName || "Nyahari Tea & Snacks";


  // ── Canvas share ─────────────────────────────────────────────────────────
  const triggerDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bill-${tokenNumber}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = `My order token #${tokenNumber} at Nyahari Tea & Snacks Centre`;
    setSharing(true);
    try {
      const items = tokenData?.order.items || [];
      const total = tokenData?.order.total || 0;
      const createdAt = tokenData?.order.createdAt || tokenData?.createdAt;
      const dateStr = createdAt ? new Date(createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
      const timeStr = createdAt ? new Date(createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
      const oId = tokenData?.order.id || orderId;
      const ref = oId ? billRef(oId) : "—";
      const pLabel = paymentLabel(tokenData?.order.paymentMethod, isCounter ? "counter" : "app").label;

      const W = 680, HEADER = 130, META = 60, COL_H = 36, ITEMS_H = Math.max(items.length, 1) * COL_H + 50, TOTAL_H = 80, PAY_H = 60, FOOTER_H = 70;
      const H = HEADER + META + ITEMS_H + TOTAL_H + PAY_H + FOOTER_H + 40;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#FDFAF4"; ctx.fillRect(0, 0, W, H);

      // Header
      ctx.fillStyle = isCounter ? "#E8920A" : "#4A1414";
      ctx.fillRect(0, 0, W, HEADER);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, 0, W, 4);

      // Shop name
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("NYAHARI TEA & SNACKS CENTRE", 32, 36);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "11px sans-serif";
      ctx.fillText(isCounter ? "Pay at Counter" : "Show to Counter Staff", 32, 56);
      ctx.fillText("Pune, Maharashtra", 32, 74);

      // Token number
      ctx.fillStyle = "white"; ctx.textAlign = "right";
      ctx.font = "10px sans-serif";
      ctx.fillText("TOKEN", W - 32, 36);
      ctx.font = "bold 72px serif";
      ctx.fillText(`#${tokenNumber}`, W - 32, 110);

      // Meta row
      let y = HEADER;
      ctx.fillStyle = "#FBF5EC"; ctx.fillRect(0, y, W, META);
      ctx.strokeStyle = "#E8D5C4"; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, y + META); ctx.lineTo(W, y + META); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#9C7A6A"; ctx.font = "9px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("BILL NO.", 32, y + 22);
      ctx.fillStyle = "#2D0A0A"; ctx.font = "bold 11px monospace";
      ctx.fillText(ref, 32, y + 40);
      ctx.fillStyle = "#9C7A6A"; ctx.font = "9px sans-serif"; ctx.textAlign = "right";
      ctx.fillText("DATE & TIME", W - 32, y + 22);
      ctx.fillStyle = "#2D0A0A"; ctx.font = "bold 11px sans-serif";
      ctx.fillText(`${dateStr}  ${timeStr}`, W - 32, y + 40);
      y += META;

      // Items header
      const PAD = 32;
      ctx.fillStyle = "#F5EEE3"; ctx.fillRect(0, y, W, 36);
      ctx.fillStyle = "#9C7A6A"; ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "left";  ctx.fillText("ITEM",   PAD, y + 22);
      ctx.textAlign = "center"; ctx.fillText("QTY",  W * 0.62, y + 22);
      ctx.textAlign = "right";  ctx.fillText("RATE", W * 0.77, y + 22);
      ctx.fillText("AMOUNT", W - PAD, y + 22);
      y += 36;

      // Items
      items.forEach((item, i) => {
        ctx.fillStyle = i % 2 === 0 ? "#FFFFFF" : "#FDFAF4"; ctx.fillRect(0, y, W, COL_H);
        ctx.fillStyle = "#2D0A0A"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(item.menuItem.name, PAD, y + 22);
        ctx.fillStyle = "#6B4F3A"; ctx.font = "12px sans-serif";
        ctx.textAlign = "center"; ctx.fillText(String(item.qty), W * 0.62, y + 22);
        ctx.textAlign = "right";  ctx.fillText(`₹${item.price}`, W * 0.77, y + 22);
        ctx.fillStyle = "#2D0A0A"; ctx.font = "bold 12px sans-serif";
        ctx.fillText(`₹${item.price * item.qty}`, W - PAD, y + 22);
        y += COL_H;
      });
      if (items.length === 0) {
        ctx.fillStyle = "#9C7A6A"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Order placed", W / 2, y + 22); y += COL_H;
      }

      // Separator dashed
      y += 8;
      ctx.strokeStyle = "#E8D5C4"; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      ctx.setLineDash([]); y += 8;

      // Total
      ctx.fillStyle = isCounter ? "#FFF3DC" : "#F9F0F0"; ctx.fillRect(PAD, y, W - PAD * 2, 56); y += 8;
      ctx.fillStyle = "#4A1414"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("TOTAL AMOUNT", PAD + 12, y + 28);
      ctx.fillStyle = isCounter ? "#E8920A" : "#4A1414"; ctx.font = "bold 28px serif"; ctx.textAlign = "right";
      ctx.fillText(`₹${total}`, W - PAD - 12, y + 32);
      y += 60;

      // Payment
      ctx.fillStyle = "#4A1414"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`Payment: ${pLabel}`, PAD, y + 16);
      ctx.fillStyle = "#9C7A6A"; ctx.font = "10px sans-serif";
      ctx.fillText(`Status: ${cfg.label}`, PAD, y + 34);
      y += 48;

      // Footer
      ctx.strokeStyle = "#E8D5C4"; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      ctx.setLineDash([]); y += 16;
      ctx.fillStyle = "#9C7A6A"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Thank you for visiting! 🙏  |  nyahari.in", W / 2, y + 16);

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("blob fail");
        const file = new File([blob], `bill-${tokenNumber}.png`, { type: "image/png" });
        const shareData = { files: [file], title: `Bill #${tokenNumber}`, text };
        if (navigator.canShare && navigator.canShare(shareData)) {
          try { await navigator.share(shareData); } catch { triggerDownload(blob); }
        } else { triggerDownload(blob); }
        setSharing(false);
      }, "image/png");
    } catch (err) {
      console.error("Share error:", err);
      if (navigator.share) navigator.share({ title: "My Bill", text, url: window.location.href }).catch(() => {});
      else { navigator.clipboard.writeText(text); alert("Bill link copied!"); }
      setSharing(false);
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto relative" style={{ background: "var(--gold-bg)" }}>
      {/* Floating Ringing Alert for Ready status pickup */}
      {isRinging && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <button
            onClick={stopRinging}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-full shadow-2xl font-bold text-xs border border-red-500 hover:bg-red-700 active:scale-95 transition-all"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>🔔 Order Ready! Tap to stop sound</span>
          </button>
        </div>
      )}

      {/* Top bar */}
      <div
        className="heritage-texture border-b border-white/10 px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--maroon-deep)" }}
      >
        <Logo variant="light" size={22} />
        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cfg.banner}`}>
          {statusIcon(currentStatus)}
          {cfg.label}
        </span>
      </div>

      {/* ── Status Hero — animates live with Supabase realtime ── */}
      <div
        key={currentStatus}
        className={`px-4 pt-8 pb-6 flex flex-col items-center text-center transition-all duration-500 ${cfg.heroBg}`}
      >
        <div className="mb-4 transition-all duration-300">
          {loading
            ? <div className="w-20 h-20 rounded-full bg-[var(--gold-pale)] grid place-items-center"><Loader2 size={36} className="text-[var(--amber-brand)] animate-spin" /></div>
            : cfg.heroIconEl
          }
        </div>
        <h1 className="font-display text-2xl text-[var(--maroon-deep)] font-bold leading-tight">
          {loading ? "Loading your order…" : cfg.heroTitle}
        </h1>
        <p className="text-sm text-[var(--muted-warm)] mt-1.5 max-w-xs">
          {loading ? "" : cfg.heroDesc}
        </p>
        {/* Live status badge pill */}
        {!loading && (
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${cfg.banner}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        )}
      </div>

      <div className="px-4 py-5 flex flex-col items-center gap-5">
        {/* Customer UPI Payment Scannable Card */}
        {isUpiAwaiting && tokenData && (
          <div className="w-full max-w-sm bg-white border-2 border-blue-500/30 rounded-2xl p-5 shadow-lg flex flex-col items-center gap-4 text-center">
            {/* Spinning loader payment confirming status */}
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-700 font-bold text-xs">
              <Loader2 size={13} className="animate-spin" />
              <span>Confirming Payment…</span>
            </div>

            <div>
              <p className="text-[10px] font-bold text-[var(--muted-warm)] uppercase tracking-wide">Amount Due</p>
              <p className="font-display text-3xl font-black text-[var(--maroon-deep)]">₹{tokenData.order.total}</p>
            </div>

            {/* Click to pay / Try Again (deep link) */}
            <a
              href={`upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${tokenData.order.total}&cu=INR&tn=${encodeURIComponent(`Token #${tokenNumber} Nyahari`)}`}
              className="w-full h-12 rounded-xl font-bold text-sm bg-blue-600 text-white flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              📱 Pay via UPI App (₹{tokenData.order.total})
            </a>

            {/* Failed payment warning message */}
            <div className="text-[11px] text-[#A16207] bg-yellow-50/70 border border-yellow-200 rounded-xl p-3 w-full text-left">
              💡 <b>Failed payment?</b> Try again using the button above, or scan and pay on the shop QR code below.
            </div>

            {/* Scannable Shop QR fallback */}
            <div className="bg-white border border-blue-100 rounded-xl p-3 shadow-inner">
              <QRCode
                value={`upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${tokenData.order.total}&cu=INR&tn=${encodeURIComponent(`Token #${tokenNumber} Nyahari`)}`}
                size={120}
              />
            </div>
            
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[var(--ink)]">{merchantName}</p>
              <p className="text-[9px] font-mono text-[var(--muted-warm)]">{merchantUpi}</p>
            </div>

            {/* Retry button */}
            <a
              href={`upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${tokenData.order.total}&cu=INR&tn=${encodeURIComponent(`Token #${tokenNumber} Nyahari`)}`}
              className="w-full h-9 rounded-lg border border-blue-200 text-xs font-bold text-blue-700 flex items-center justify-center gap-1.5 hover:bg-blue-50/50 transition-colors"
            >
              🔄 Try Payment Again
            </a>
            
            <div className="text-[9px] text-[var(--muted-warm)]/75 leading-normal mt-1 pt-2 border-t border-dashed border-gray-100 w-full">
              Staff will confirm your token immediately upon hearing the payment voice alert.
            </div>
          </div>
        )}

        {/* Bill card */}
        {loading ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 size={28} className="text-[var(--amber-brand)] animate-spin" />
            <p className="text-sm text-[var(--muted-warm)]">Loading bill…</p>
          </div>
        ) : (
          <BillCard
            tokenNumber={tokenNumber}
            tokenData={tokenData}
            currentStatus={currentStatus}
            isCounter={isCounter}
            isServed={isServed}
          />
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Link
            href="/order"
            className="flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm text-white shadow-md hover:scale-[1.02] active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, var(--success-brand) 0%, #145c30 100%)", boxShadow: "0 4px 14px rgba(26,107,58,0.25)" }}
          >
            ← Order More
          </Link>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-[var(--maroon-deep)] text-[var(--maroon-deep)] font-semibold hover:bg-[var(--hover-warm)] transition-all text-sm active:scale-95 disabled:opacity-50"
          >
            {sharing ? <><Loader2 size={15} className="animate-spin" /> Preparing…</> : <><Share2 size={15} /> Share Bill</>}
          </button>
        </div>

        {orderId && (
          <p className="text-[10px] text-[var(--muted-warm)]/50 font-mono">Ref: {orderId}</p>
        )}
      </div>
    </div>
  );

}

export default function TokenScreen() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--gold-bg)] grid place-items-center">
        <div className="text-center">
          <TeaCupIcon className="w-12 h-12 text-[var(--amber-brand)] mx-auto animate-pulse" />
          <p className="text-[var(--muted-warm)] mt-2 text-sm">Loading bill…</p>
        </div>
      </div>
    }>
      <TokenContent />
    </Suspense>
  );
}
