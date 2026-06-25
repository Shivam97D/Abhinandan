'use client';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Share2, ArrowRight, Loader2 } from "lucide-react";
import { Logo, TeaCupIcon } from "@/components/Logo";

type TokenData = {
  id: string;
  tokenNumber: number;
  status: string;
  order: {
    total: number;
    paymentMethod: string | null;
    items: { qty: number; price: number; menuItem: { name: string } }[];
  };
};

function TokenContent() {
  const searchParams = useSearchParams();
  const tokenNumber = searchParams.get("token") || "—";
  const orderId = searchParams.get("orderId") || "";
  const method = searchParams.get("method") || "upi"; // "upi" or "counter"

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenNumber || tokenNumber === "—") { setLoading(false); return; }
    fetch(`/api/tokens/by-number/${tokenNumber}`)
      .then((r) => r.json())
      .then((d) => setTokenData(d.token || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tokenNumber]);

  const isCounter = method === "counter";

  const orderSummary = tokenData?.order.items
    .map((i) => `${i.menuItem.name} ×${i.qty}`)
    .join(" · ") || "Order placed";

  const total = tokenData?.order.total || 0;

  const handleShare = () => {
    const text = `My token number is #${tokenNumber} at Abhinandan Tea & Snacks Centre`;
    if (navigator.share) navigator.share({ title: "My Token", text });
    else navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto" style={{ background: "var(--gold-bg)" }}>
      {/* Top bar */}
      <div
        className="heritage-texture border-b border-white/10 px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--maroon-deep)" }}
      >
        <Logo variant="light" size={22} />
        <span className="text-[var(--gold-pale)] text-sm flex items-center gap-1.5">
          <CheckCircle2 size={15} className={isCounter ? "text-[var(--amber-brand)]" : "text-green-400"} />
          {isCounter ? "Token Generated" : "Payment Received"}
        </span>
      </div>

      <div className="px-4 py-8 flex flex-col items-center text-center">
        {/* Icon + heading */}
        {isCounter ? (
          <>
            <div className="w-20 h-20 rounded-full grid place-items-center mb-4"
              style={{ background: "rgba(232,146,10,0.12)" }}>
              <span className="text-4xl">🧾</span>
            </div>
            <h1 className="font-display text-2xl text-[var(--maroon-deep)]">Show at Counter to Pay!</h1>
            <p className="text-sm text-[var(--muted-warm)] mt-1 max-w-xs">
              Your order is placed. Show this token to the counter staff and pay there.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full grid place-items-center mb-4"
              style={{ background: "rgba(26,107,58,0.10)" }}>
              <CheckCircle2 size={52} className="text-[var(--success-brand)]" />
            </div>
            <h1 className="font-display text-2xl text-[var(--maroon-deep)]">Payment Received!</h1>
            <p className="text-sm text-[var(--muted-warm)] mt-1">Your order is being prepared</p>
          </>
        )}

        {/* Token card */}
        <div
          className="my-6 w-full max-w-xs mx-auto py-8 px-6 text-center relative overflow-hidden rounded-2xl"
          style={{
            border: `2px solid ${isCounter ? "var(--amber-brand)" : "var(--maroon-deep)"}`,
            background: "white",
          }}
        >
          <div className="absolute inset-0 heritage-texture opacity-30" />
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-2"
              style={{ color: isCounter ? "var(--amber-brand)" : "var(--maroon-deep)" }}>
              {isCounter ? "Pay at Counter — Token" : "Show to Counter Staff"}
            </p>
            <div className="h-px bg-[var(--border-warm)] mb-4" />

            <div className="relative">
              <TeaCupIcon className="absolute -top-2 -right-2 w-10 h-10 text-[var(--amber-brand)] opacity-20" />
              <p className="font-display text-8xl leading-none text-[var(--maroon-deep)]">
                #{tokenNumber}
              </p>
            </div>

            <p className="text-xs text-[var(--muted-warm)] uppercase tracking-widest mt-2">Your Token</p>
            <div className="h-px bg-[var(--border-warm)] my-4" />

            {loading ? (
              <Loader2 size={16} className="text-[var(--amber-brand)] animate-spin mx-auto" />
            ) : (
              <>
                <p className="text-xs text-[var(--muted-warm)] leading-relaxed">{orderSummary}</p>
                {total > 0 && (
                  <p className="text-sm font-semibold text-[var(--maroon-deep)] mt-1">
                    {isCounter ? `To Pay: ₹${total}` : `Paid: ₹${total}`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
          style={{
            background: isCounter ? "rgba(232,146,10,0.12)" : "rgba(26,107,58,0.10)",
            color: isCounter ? "var(--pending-brand)" : "var(--success-brand)",
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isCounter ? "var(--pending-brand)" : "var(--success-brand)" }} />
          {isCounter ? "Waiting for payment at counter" : "Your order is being prepared"}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {tokenData?.id && (
            <Link
              href={`/token/${tokenData.id}`}
              className="flex items-center justify-center gap-2 text-[var(--amber-brand)] font-semibold hover:underline text-sm"
            >
              Track Order Live <ArrowRight size={15} />
            </Link>
          )}
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-[var(--maroon-deep)] text-[var(--maroon-deep)] font-semibold hover:bg-[var(--hover-warm)] transition-colors text-sm"
          >
            <Share2 size={15} /> Share Token
          </button>
          <Link href="/order" className="text-xs text-[var(--muted-warm)] hover:text-[var(--brown)] transition-colors">
            ← Order more
          </Link>
        </div>

        {orderId && (
          <p className="mt-6 text-[10px] text-[var(--muted-warm)]/50 font-mono">Ref: {orderId}</p>
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
          <p className="text-[var(--muted-warm)] mt-2 text-sm">Loading token…</p>
        </div>
      </div>
    }>
      <TokenContent />
    </Suspense>
  );
}
