'use client';

import { useEffect, useState } from "react";
import { UserPlus, Loader2, Trash2, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

type StaffMember = {
  id: string;
  name: string;
  role: "owner" | "section_manager" | "snacks_staff" | "tea_staff";
  section: "tea" | "snacks" | null;
  phone: string | null;
  supabaseId: string | null;
  createdAt: string;
  _count?: { teaEntries: number };
};

const ROLE_DISPLAY: Record<string, string> = {
  owner:           "Owner",
  section_manager: "Section Manager",
  snacks_staff:    "Snacks Staff",
  tea_staff:       "Tea Staff",
};

const ROLE_BADGE: Record<string, string> = {
  owner:           "bg-[var(--maroon-deep)]/10 text-[var(--maroon-deep)]",
  section_manager: "bg-blue-50 text-blue-700",
  snacks_staff:    "bg-amber-50 text-amber-700",
  tea_staff:       "bg-green-50 text-green-700",
};

const ROLE_COLORS: Record<string, string> = {
  owner:           "#4A1414",
  section_manager: "#2563EB",
  snacks_staff:    "#E8920A",
  tea_staff:       "#1A6B3A",
};

type FormState = { name: string; username: string; password: string; role: string; section: string; phone: string };
const BLANK: FormState = { name: "", username: "", password: "", role: "snacks_staff", section: "", phone: "" };

export default function StaffPage() {
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<FormState>(BLANK);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/staff").then(r => r.json()).then(d => setStaff(d.staff || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.username || !form.password || !form.role) {
      setFormError("All required fields must be filled"); return;
    }
    setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setFormError(d.error || "Failed to create staff"); return; }
      setShowForm(false);
      setForm(BLANK);
      load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  };

  const deleteStaff = async (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
    await fetch(`/api/staff?id=${id}`, { method: "DELETE" }).catch(() => load());
  };

  const teaStaff    = staff.filter(s => s.section === "tea");
  const snacksStaff = staff.filter(s => s.section === "snacks" || s.role === "snacks_staff");
  const morning     = staff.filter(s => s.role === "tea_staff");

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Staff</h1>
            <p className="text-xs text-[var(--muted-warm)]">{staff.length} team members</p>
          </div>
          <button onClick={() => { setForm(BLANK); setFormError(""); setShowForm(true); }}
            className="btn-amber h-9 px-4 text-sm flex items-center gap-1.5 rounded-lg">
            <UserPlus size={14} /> Add Staff
          </button>
        </header>

        <div className="p-4 lg:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Staff",    val: staff.length },
              { label: "Tea Section",    val: teaStaff.length },
              { label: "Snacks Section", val: snacksStaff.length },
              { label: "Tea Staff",      val: morning.length },
            ].map((s) => (
              <div key={s.label} className="card-warm p-4 text-center">
                <p className="text-xs text-[var(--muted-warm)] uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-[var(--maroon-deep)] mt-1">{s.val}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 size={32} className="text-[var(--amber-brand)] animate-spin" /></div>
          ) : staff.length === 0 ? (
            <div className="text-center py-16 text-[var(--muted-warm)]">
              <p className="text-base font-semibold">No staff added yet</p>
              <p className="text-sm mt-1">Tap &quot;Add Staff&quot; to create the first account</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {staff.map((s) => (
                <div key={s.id} className="card-warm p-5 flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full grid place-items-center font-bold text-base text-white shrink-0"
                    style={{ background: ROLE_COLORS[s.role] ?? "#4A1414" }}>
                    {s.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--ink)] truncate">{s.name}</p>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-0.5 ${ROLE_BADGE[s.role] ?? ""}`}>
                      {ROLE_DISPLAY[s.role] ?? s.role}
                    </span>
                    <div className="mt-2 space-y-0.5 text-xs text-[var(--muted-warm)]">
                      {s.section && <p>Section: <span className="font-semibold text-[var(--ink)] capitalize">{s.section}</span></p>}
                      {s.phone && <p>Phone: <span className="font-mono text-[var(--ink)]">{s.phone}</span></p>}
                      <p>Since: <span className="font-semibold text-[var(--ink)]">{new Date(s.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span></p>
                      {s._count && s._count.teaEntries > 0 && <p>Tea entries: <span className="font-semibold text-[var(--ink)]">{s._count.teaEntries}</span></p>}
                    </div>
                  </div>
                  <button onClick={() => setDeleteConfirm(s.id)}
                    className="p-1.5 text-[var(--muted-warm)] hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-[var(--maroon-deep)] text-lg mb-2">Remove staff member?</h3>
            <p className="text-sm text-[var(--muted-warm)] mb-5">Their login will be disabled and account removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-10 rounded-lg border border-[var(--border-warm)] text-sm text-[var(--muted-warm)]">Cancel</button>
              <button onClick={() => deleteStaff(deleteConfirm)} className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Add staff drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setShowForm(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--border-warm)]" />
            </div>
            <div className="px-5 pb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl text-[var(--maroon-deep)]">Add Staff Member</h2>
                <button onClick={() => !saving && setShowForm(false)} className="p-1 text-[var(--muted-warm)]"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Username *</label>
                    <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                      placeholder="ramesh"
                      className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none" />
                    <p className="text-[10px] text-[var(--muted-warm)] mt-1">{form.username ? `${form.username}@abhinandan.in` : "username@abhinandan.in"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Password *</label>
                    <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Role *</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full h-11 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none">
                      <option value="owner">Owner</option>
                      <option value="section_manager">Section Manager</option>
                      <option value="snacks_staff">Snacks Staff</option>
                      <option value="tea_staff">Tea Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Section</label>
                    <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                      className="w-full h-11 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none">
                      <option value="">— None —</option>
                      <option value="snacks">Snacks</option>
                      <option value="tea">Tea</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="9876543210" inputMode="numeric"
                    className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none" />
                </div>

                {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

                <button onClick={save} disabled={saving}
                  className="btn-amber w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 mt-2">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : "Create Staff Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
