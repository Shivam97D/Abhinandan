'use client';

import { useEffect, useState } from "react";
import { Save, AlertCircle, Loader2, CheckCircle2, Store, CreditCard, Clock, Bell, Hash, Info } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

// ─── Types ────────────────────────────────────────────────────────────────────
type Settings = {
  shopName: string;
  location: string;
  phone: string;
  email: string;
  gstNumber: string;
  fssaiNumber: string;
  website: string;
  upiId: string;
  upiMerchantName: string;
  teaPricePerCup: number;
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
  tokenResetTime: string;
  smsOnTokenReady: boolean;
  dailyReportWhatsapp: boolean;
  manualUpiConfirm: boolean;
};

const DEFAULTS: Settings = {
  shopName: "Nyahari Tea & Snacks Centre",
  location: "Pune, Maharashtra",
  phone: "",
  email: "",
  gstNumber: "",
  fssaiNumber: "",
  website: "",
  upiId: "",
  upiMerchantName: "Nyahari Tea & Snacks",
  teaPricePerCup: 12,
  morningStart: "07:00",
  morningEnd: "14:00",
  eveningStart: "14:00",
  eveningEnd: "22:00",
  tokenResetTime: "07:00",
  smsOnTokenReady: true,
  dailyReportWhatsapp: false,
  manualUpiConfirm: true,
};

// ─── UI helpers ───────────────────────────────────────────────────────────────
const INPUT =
  "w-full h-10 px-3 bg-white border border-[var(--border-warm)] rounded-lg text-sm text-[var(--ink)] focus:border-[var(--brown)] focus:ring-2 focus:ring-[var(--amber-brand)]/10 outline-none transition placeholder:text-[var(--muted-warm)]/50 disabled:opacity-50 disabled:cursor-not-allowed";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card-warm p-5">
      <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4 pb-3 border-b border-[var(--border-warm)] flex items-center gap-2">
        <span className="text-[var(--amber-brand)]">{icon}</span>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, note, children, half,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
  half?: boolean;
}) {
  return (
    <div className={half ? "" : ""}>
      <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {note && <p className="text-[11px] text-[var(--muted-warm)] mt-1">{note}</p>}
    </div>
  );
}

function Toggle({
  label, sub, value, onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full"
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
        <p className="text-xs text-[var(--muted-warm)]">{sub}</p>
      </div>
      <div
        className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${value ? "bg-[var(--success-brand)]" : "bg-[var(--border-warm)]"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${value ? "right-0.5" : "left-0.5"}`}
        />
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  // Load settings from DB on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setS({ ...DEFAULTS, ...d.settings });
        }
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    setS((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setS({ ...DEFAULTS, ...data.settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        {/* Sticky header */}
        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Settings</h1>
            <p className="text-xs text-[var(--muted-warm)]">Shop configuration &amp; billing info</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-amber h-9 px-4 text-sm flex items-center gap-1.5 rounded-lg disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={13} className="animate-spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle2 size={13} /> Saved!</>
            ) : (
              <><Save size={13} /> Save Changes</>
            )}
          </button>
        </header>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={28} className="text-[var(--amber-brand)] animate-spin" />
          </div>
        ) : (
          <div className="p-4 lg:p-8 max-w-2xl space-y-5">

            {/* Error */}
            {error && (
              <div className="flex gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                {error}
              </div>
            )}

            {/* Secrets notice */}
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                API credentials (Supabase, Razorpay, SMS secret) stay in{" "}
                <code className="bg-amber-100 px-1 rounded">.env.local</code> — never enter them here.
                Everything else is saved to the database.
              </p>
            </div>

            {/* ── Shop Info ──────────────────────────────────────── */}
            <Section icon={<Store size={15} />} title="Shop Info">
              <Field label="Shop Name">
                <input className={INPUT} value={s.shopName}
                  onChange={(e) => set("shopName", e.target.value)}
                  placeholder="Nyahari Tea & Snacks Centre" />
              </Field>
              <Field label="Location / Address">
                <input className={INPUT} value={s.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Pune, Maharashtra" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <input className={INPUT} value={s.phone} type="tel"
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+91 98XXX XXXXX" />
                </Field>
                <Field label="Email">
                  <input className={INPUT} value={s.email} type="email"
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="shop@example.com" />
                </Field>
              </div>
              <Field label="Website">
                <input className={INPUT} value={s.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://nyahari.in" />
              </Field>
            </Section>

            {/* ── Legal / Tax ───────────────────────────────────── */}
            <Section icon={<Info size={15} />} title="Legal & Tax Info (shown on bills)">
              <div className="grid grid-cols-2 gap-4">
                <Field label="GST Number"
                  note="15-char GSTIN — shown on bills">
                  <input className={INPUT} value={s.gstNumber}
                    onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
                    placeholder="27AAAAA0000A1Z5"
                    maxLength={15} />
                </Field>
                <Field label="FSSAI Licence No."
                  note="Food safety licence number">
                  <input className={INPUT} value={s.fssaiNumber}
                    onChange={(e) => set("fssaiNumber", e.target.value)}
                    placeholder="XXXXXXXXXXXXXXXXXX" />
                </Field>
              </div>
            </Section>

            {/* ── UPI / Payment ─────────────────────────────────── */}
            <Section icon={<CreditCard size={15} />} title="UPI & Payment">
              <Field label="Merchant UPI ID"
                note="This is embedded in the QR code shown to customers">
                <input className={INPUT} value={s.upiId}
                  onChange={(e) => set("upiId", e.target.value)}
                  placeholder="yourname@upi" />
              </Field>
              <Field label="Merchant Display Name"
                note="Shown inside Google Pay / PhonePe when customer scans">
                <input className={INPUT} value={s.upiMerchantName}
                  onChange={(e) => set("upiMerchantName", e.target.value)}
                  placeholder="Nyahari Tea & Snacks" />
              </Field>
              <Field label="Tea Price per Cup (₹)"
                note="SMS auto-detection: UPI credit ÷ this value = number of cups">
                <input className={INPUT} value={s.teaPricePerCup} type="number" min={1}
                  onChange={(e) => set("teaPricePerCup", parseFloat(e.target.value) || 12)} />
              </Field>

              {/* Manual UPI confirm toggle */}
              <div className="flex items-start justify-between gap-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs font-bold text-blue-800">Manual UPI Confirmation Mode</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">
                    Counter UPI orders go to &ldquo;Awaiting Payment&rdquo; queue with a scannable QR. Staff confirms after hearing GPay/PhonePe sound.
                  </p>
                  <p className="text-[10px] text-blue-500 mt-1">
                    Disable only when automatic SMS payment detection is set up.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => set("manualUpiConfirm", !s.manualUpiConfirm)}
                  className="shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ background: s.manualUpiConfirm ? "#2563eb" : "#d1d5db" }}
                >
                  <span
                    className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: s.manualUpiConfirm ? "translateX(22px)" : "translateX(2px)" }}
                  />
                </button>
              </div>
            </Section>

            {/* ── Shift Timings ─────────────────────────────────── */}
            <Section icon={<Clock size={15} />} title="Shift Timings">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Morning Shift Start">
                  <input className={INPUT} value={s.morningStart} type="time"
                    onChange={(e) => set("morningStart", e.target.value)} />
                </Field>
                <Field label="Morning Shift End">
                  <input className={INPUT} value={s.morningEnd} type="time"
                    onChange={(e) => set("morningEnd", e.target.value)} />
                </Field>
                <Field label="Evening Shift Start">
                  <input className={INPUT} value={s.eveningStart} type="time"
                    onChange={(e) => set("eveningStart", e.target.value)} />
                </Field>
                <Field label="Evening Shift End">
                  <input className={INPUT} value={s.eveningEnd} type="time"
                    onChange={(e) => set("eveningEnd", e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* ── Token Settings ────────────────────────────────── */}
            <Section icon={<Hash size={15} />} title="Token Settings">
              <Field label="Daily Token Reset Time"
                note="Tokens reset to #001 at this time every day">
                <input className={INPUT} value={s.tokenResetTime} type="time"
                  onChange={(e) => set("tokenResetTime", e.target.value)} />
              </Field>
              <Field label="Token Format">
                <input className={INPUT} value="#XXX — 3-digit, daily reset" disabled />
              </Field>
            </Section>

            {/* ── SMS / Notification ────────────────────────────── */}
            <Section icon={<Bell size={15} />} title="Notifications">
              <Toggle
                label="SMS when order is ready"
                sub="Send SMS to customer's mobile when their token is called"
                value={s.smsOnTokenReady}
                onChange={(v) => set("smsOnTokenReady", v)}
              />
              <Toggle
                label="Daily report on WhatsApp"
                sub="Share end-of-day summary via WhatsApp at shift end"
                value={s.dailyReportWhatsapp}
                onChange={(v) => set("dailyReportWhatsapp", v)}
              />
            </Section>

            {/* ── SMS Auto-Detection (read-only info) ───────────── */}
            <Section icon={<Info size={15} />} title="SMS Auto-Detection (read-only)">
              <Field label="SMS Forwarder Endpoint"
                note="Configure this URL in your Android SMS Forwarder or Tasker app">
                <input className={INPUT}
                  value={typeof window !== "undefined" ? `${window.location.origin}/api/sms` : "/api/sms"}
                  readOnly
                  onClick={(e) => { (e.target as HTMLInputElement).select(); }}
                />
              </Field>
              <Field label="SMS Forwarder Secret"
                note="Set SMS_FORWARDER_SECRET in .env.local — paste the same value in the Android app">
                <input className={INPUT} value="••••••••••••••••" type="password" disabled />
              </Field>
            </Section>

            {/* Bottom save button repeat */}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="btn-amber w-full h-11 text-sm flex items-center justify-center gap-2 rounded-xl disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : saved ? (
                <><CheckCircle2 size={14} /> All changes saved!</>
              ) : (
                <><Save size={14} /> Save All Settings</>
              )}
            </button>

          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
