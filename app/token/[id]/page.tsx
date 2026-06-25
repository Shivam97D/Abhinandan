'use client';

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Check, Wifi, Phone, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/utils/supabase/client";

type TokenStatus = "awaiting_payment" | "pending" | "preparing" | "ready" | "served";

type TokenData = {
  id: string;
  tokenNumber: number;
  status: TokenStatus;
  order: {
    total: number;
    paymentMethod: string | null;
    mobile: string | null;
    items: { qty: number; price: number; menuItem: { name: string } }[];
  };
};

const STATUS_CONFIG: Record<TokenStatus, { label: string; bg: string; text: string; pulse: string }> = {
  awaiting_payment: {
    label: "⏳ Awaiting Payment",
    bg: "bg-orange-50",
    text: "text-orange-700",
    pulse: "bg-orange-500",
  },
  pending: {
    label: "🕐 Order Confirmed",
    bg: "bg-[var(--gold-pale)]",
    text: "text-[var(--pending-brand)]",
    pulse: "bg-[var(--pending-brand)]",
  },
  preparing: {
    label: "🔥 Being Prepared",
    bg: "bg-amber-50",
    text: "text-amber-700",
    pulse: "bg-amber-500",
  },
  ready: {
    label: "✅ Ready for Pickup!",
    bg: "bg-[var(--amber-brand)]",
    text: "text-[var(--maroon-deep)]",
    pulse: "bg-[var(--maroon-deep)]",
  },
  served: {
    label: "🎉 Served",
    bg: "bg-[var(--success-brand)]",
    text: "text-white",
    pulse: "bg-white",
  },
};

const STEPS: { key: TokenStatus; label: string }[] = [
  { key: "awaiting_payment", label: "Payment" },
  { key: "pending", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "served", label: "Served" },
];

const STATUS_ORDER: TokenStatus[] = ["awaiting_payment", "pending", "preparing", "ready", "served"];

function getStepState(step: TokenStatus, current: TokenStatus): "done" | "active" | "pending" {
  const stepIdx = STATUS_ORDER.indexOf(step);
  const currIdx = STATUS_ORDER.indexOf(current);
  if (stepIdx < currIdx) return "done";
  if (stepIdx === currIdx) return "active";
  return "pending";
}

export default function TokenTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tokenId } = use(params);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [status, setStatus] = useState<TokenStatus>("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tokens/${tokenId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.token) {
          setTokenData(d.token);
          setStatus(d.token.status as TokenStatus);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tokenId]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tokens")
      .on("broadcast", { event: "token_update" }, ({ payload }) => {
        if (payload.tokenId === tokenId) {
          setStatus(payload.status as TokenStatus);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tokenId]);

  const cfg = STATUS_CONFIG[status];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gold-bg)] grid place-items-center">
        <div className="text-center">
          <Loader2 size={36} className="text-[var(--amber-brand)] animate-spin mx-auto" />
          <p className="text-sm text-[var(--muted-warm)] mt-3">Loading your order…</p>
        </div>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-[var(--gold-bg)] grid place-items-center">
        <div className="text-center px-4">
          <p className="text-[var(--maroon-deep)] font-semibold">Token not found</p>
          <Link href="/order" className="text-xs text-[var(--amber-brand)] mt-2 block hover:underline">
            ← Place a new order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gold-bg)] max-w-lg mx-auto px-4 py-6">
      <header className="text-center mb-6">
        <Logo size={22} />
        <p className="text-xs text-[var(--muted-warm)] mt-1">Track Your Order</p>
      </header>

      {/* Token display */}
      <div className="card-warm border-2 border-[var(--amber-brand)] py-8 text-center mb-5">
        <p className="text-7xl font-bold text-[var(--maroon-deep)] leading-none">
          #{tokenData.tokenNumber}
        </p>
        <p className="text-xs text-[var(--muted-warm)] mt-3 uppercase tracking-widest">Token Number</p>
        <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.pulse}`} />
          {cfg.label}
        </div>
      </div>

      {/* Order summary */}
      <div className="card-warm p-4 mb-5">
        <p className="text-xs font-semibold uppercase text-[var(--muted-warm)] mb-2">Order</p>
        <div className="space-y-1 text-sm">
          {tokenData.order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-[var(--ink)]">
              <span>{item.menuItem.name} × {item.qty}</span>
              <span>₹{item.price * item.qty}</span>
            </div>
          ))}
          <div className="border-t border-[var(--border-warm)] pt-1 flex justify-between font-bold text-[var(--maroon-deep)]">
            <span>
              Total
              {tokenData.order.paymentMethod && (
                <span className="font-normal text-[var(--muted-warm)] ml-1 capitalize">
                  · {tokenData.order.paymentMethod.replace("_", " ")}
                </span>
              )}
            </span>
            <span>₹{tokenData.order.total}</span>
          </div>
        </div>
      </div>

      {/* Status stepper */}
      <div className="card-warm p-5 mb-5">
        <p className="text-sm font-bold text-[var(--maroon-deep)] mb-4">Order Progress</p>
        <div className="space-y-1">
          {STEPS.map((step, i) => {
            const state = getStepState(step.key, status);
            const isLast = i === STEPS.length - 1;

            const dotClass = {
              done: "bg-[var(--success-brand)] text-white",
              active: "bg-[var(--amber-brand)] text-[var(--maroon-deep)] animate-pulse",
              pending: "bg-[var(--border-warm)] text-[var(--muted-warm)]",
            }[state];

            const lineClass = {
              done: "bg-[var(--success-brand)]",
              active: "bg-[var(--amber-brand)]",
              pending: "bg-[var(--border-warm)]",
            }[state];

            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full grid place-items-center text-sm transition-colors ${dotClass}`}>
                    {state === "done" ? <Check size={15} /> : i + 1}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 min-h-[28px] transition-colors ${lineClass}`} />
                  )}
                </div>
                <div className="pb-4 -mt-0.5">
                  <p className={`font-semibold text-sm ${state === "pending" ? "text-[var(--muted-warm)]" : "text-[var(--maroon-deep)]"}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-[var(--success-brand)] mb-4">
        <Wifi size={13} /> This page updates automatically
      </p>

      {tokenData.order.mobile && (
        <a
          href={`tel:${tokenData.order.mobile}`}
          className="w-full h-12 rounded-xl border-2 border-[var(--maroon-deep)] text-[var(--maroon-deep)] font-semibold flex items-center justify-center gap-2 hover:bg-[var(--hover-warm)] transition-colors mb-4"
        >
          <Phone size={15} /> Need help? Call counter
        </a>
      )}

      <Link href="/order" className="block text-center text-xs text-[var(--muted-warm)] hover:text-[var(--brown)] transition-colors">
        ← Order more items
      </Link>
    </div>
  );
}
