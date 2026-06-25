'use client';

import { useState } from "react";
import { Save, AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-warm p-5">
      <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4 pb-3 border-b border-[var(--border-warm)]">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {note && <p className="text-[11px] text-[var(--muted-warm)] mt-1">{note}</p>}
    </div>
  );
}

const INPUT = "w-full h-10 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-sm text-[var(--ink)] focus:border-[var(--brown)] focus:ring-2 focus:ring-[var(--amber-brand)]/10 outline-none transition";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Settings</h1>
            <p className="text-xs text-[var(--muted-warm)]">Shop configuration & credentials</p>
          </div>
          <button onClick={handleSave} className="btn-amber h-9 px-4 text-sm flex items-center gap-1.5 rounded-lg">
            <Save size={13} /> {saved ? "Saved!" : "Save Changes"}
          </button>
        </header>

        <div className="p-4 lg:p-8 max-w-2xl space-y-5">

          {/* Credentials notice */}
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Credentials (Supabase, Razorpay, SMS) are stored in <code className="bg-amber-100 px-1 rounded">.env.local</code>.
              Edit that file directly — do not paste secrets here.
            </p>
          </div>

          <Section title="Shop Info">
            <Field label="Shop Name">
              <input className={INPUT} defaultValue="Abhinandan Tea & Snacks Centre" />
            </Field>
            <Field label="Location">
              <input className={INPUT} defaultValue="Pune, Maharashtra" />
            </Field>
            <Field label="Phone">
              <input className={INPUT} defaultValue="+91 98XXX XXXXX" type="tel" />
            </Field>
          </Section>

          <Section title="UPI Payment">
            <Field label="Merchant UPI ID" note="This is shown on the customer QR code">
              <input className={INPUT} defaultValue="abhinandan@upi" placeholder="yourname@upi" />
            </Field>
            <Field label="Merchant Name" note="Shown in UPI payment apps">
              <input className={INPUT} defaultValue="Abhinandan Tea & Snacks" />
            </Field>
            <Field label="Tea Price per Cup (₹)" note="Auto-detection: payments divisible by this amount = tea order">
              <input className={INPUT} defaultValue="12" type="number" />
            </Field>
          </Section>

          <Section title="Shift Timings">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Morning Shift Start">
                <input className={INPUT} defaultValue="07:00" type="time" />
              </Field>
              <Field label="Morning Shift End">
                <input className={INPUT} defaultValue="14:00" type="time" />
              </Field>
              <Field label="Evening Shift Start">
                <input className={INPUT} defaultValue="14:00" type="time" />
              </Field>
              <Field label="Evening Shift End">
                <input className={INPUT} defaultValue="22:00" type="time" />
              </Field>
            </div>
          </Section>

          <Section title="Token Settings">
            <Field label="Token Reset Time" note="Tokens reset to #001 at this time daily">
              <input className={INPUT} defaultValue="07:00" type="time" />
            </Field>
            <Field label="Token Format" note="Zero-padded 3-digit e.g. #047">
              <input className={INPUT} defaultValue="#XXX (3-digit, daily reset)" disabled />
            </Field>
          </Section>

          <Section title="SMS Auto-Detection">
            <Field label="SMS Forwarder Endpoint" note="Configure this URL in your Android SMS Forwarder app">
              <input className={INPUT} defaultValue="https://your-domain.com/api/sms" readOnly />
            </Field>
            <Field label="SMS Forwarder Secret" note="Set SMS_FORWARDER_SECRET in .env.local — same value in the app">
              <input className={INPUT} defaultValue="••••••••••••••••" type="password" disabled />
            </Field>
          </Section>

          <Section title="Notifications">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Token ready SMS alert</p>
                <p className="text-xs text-[var(--muted-warm)]">SMS customer when order is ready</p>
              </div>
              <div className="w-11 h-6 rounded-full bg-[var(--success-brand)] relative">
                <span className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Daily report WhatsApp</p>
                <p className="text-xs text-[var(--muted-warm)]">Share daily summary at end of shift</p>
              </div>
              <div className="w-11 h-6 rounded-full bg-[var(--border-warm)] relative">
                <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </label>
          </Section>

        </div>
      </main>
      <BottomNav />
    </div>
  );
}
