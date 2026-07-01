'use client';

import { useEffect, useState } from "react";
import { UserPlus, Loader2, Trash2, X, Phone, Mail, Shield, ChevronDown } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { useSessionGuard } from "@/hooks/useSessionGuard";

type StaffMember = {
  id: string;
  name: string;
  role: "owner" | "section_manager" | "snacks_staff" | "tea_staff";
  section: "tea" | "snacks" | null;
  phone: string | null;
  email: string | null;
  supabaseId: string | null;
  createdAt: string;
  _count?: { teaEntries: number };
};

type PendingUser = {
  supabaseId: string;
  email: string | null;
  name: string;
  role: string | null;
  createdAt: string;
};

const ROLE_DISPLAY: Record<string, string> = {
  owner: "Owner", section_manager: "Section Manager",
  snacks_staff: "Snacks Staff",
};
const ROLE_BADGE: Record<string, string> = {
  owner: "bg-[var(--maroon-deep)]/10 text-[var(--maroon-deep)]",
  section_manager: "bg-blue-50 text-blue-700",
  snacks_staff: "bg-amber-50 text-amber-700",
};
const ROLE_COLORS: Record<string, string> = {
  owner: "#4A1414", section_manager: "#2563EB",
  snacks_staff: "#E8920A",
};

type FormState = { name: string; username: string; password: string; role: string; section: string; phone: string };
const BLANK: FormState = { name: "", username: "", password: "", role: "snacks_staff", section: "", phone: "" };

export default function StaffPage() {
  useSessionGuard();
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState<FormState>(BLANK);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState("");
  const [deleteConfirm, setDeleteConfirm]   = useState<string | null>(null);
  const [profileOf, setProfileOf]       = useState<StaffMember | null>(null);
  const [editingRole, setEditingRole]   = useState<{ id: string; role: string } | null>(null);
  const [assigningPending, setAssigningPending] = useState<PendingUser | null>(null);
  const [assignRole, setAssignRole]     = useState("snacks_staff");
  const [assignName, setAssignName]     = useState("");
  const [assignSection, setAssignSection] = useState("");
  const [assignPhone, setAssignPhone]   = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/staff")
      .then(r => r.json())
      .then(d => { setStaff(d.staff || []); setPendingUsers(d.pendingUsers || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
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
      setShowForm(false); setForm(BLANK); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  };

  const deleteStaff = async (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
    await fetch(`/api/staff?id=${id}`, { method: "DELETE" }).catch(() => load());
  };

  const updateRole = async (id: string, role: string) => {
    setEditingRole(null);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, role: role as StaffMember["role"] } : s));
    await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    }).catch(() => load());
  };

  const assignPendingUser = async () => {
    if (!assigningPending || !assignRole || !assignName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseId: assigningPending.supabaseId,
          name: assignName,
          role: assignRole,
          section: assignSection || undefined,
          phone: assignPhone || undefined,
        }),
      });
      if (res.ok) { setAssigningPending(null); load(); }
    } catch {}
    finally { setSaving(false); }
  };

  const snacksStaff = staff.filter(s => s.section === "snacks" || s.role === "snacks_staff");
  const managers    = staff.filter(s => s.role === "section_manager");

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Staff & Users</h1>
            <p className="text-xs text-[var(--muted-warm)]">{staff.length} members · {pendingUsers.length} pending assignment</p>
          </div>
          <button onClick={() => { setForm(BLANK); setFormError(""); setShowForm(true); }}
            className="btn-amber h-9 px-4 text-sm flex items-center gap-1.5 rounded-lg">
            <UserPlus size={14} /> Add Staff
          </button>
        </header>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Staff",    val: staff.length },
              { label: "Managers",       val: managers.length },
              { label: "Snacks Staff",   val: snacksStaff.length },
              { label: "Pending",        val: pendingUsers.length },
            ].map((s) => (
              <div key={s.label} className="card-warm p-4 text-center">
                <p className="text-xs text-[var(--muted-warm)] uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-[var(--maroon-deep)] mt-1">{s.val}</p>
              </div>
            ))}
          </div>

          {/* Staff cards */}
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
                <div key={s.id} className="card-warm p-4 flex gap-3 items-start">
                  <div className="w-11 h-11 rounded-full grid place-items-center font-bold text-sm text-white shrink-0"
                    style={{ background: ROLE_COLORS[s.role] ?? "#4A1414" }}>
                    {s.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--ink)] truncate">{s.name}</p>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-0.5 ${ROLE_BADGE[s.role] ?? ""}`}>
                      {ROLE_DISPLAY[s.role] ?? s.role}
                    </span>
                    {s.section && (
                      <p className="text-xs text-[var(--muted-warm)] mt-1">Section: <span className="font-semibold text-[var(--ink)] capitalize">{s.section}</span></p>
                    )}
                    {s.phone && (
                      <p className="text-xs text-[var(--muted-warm)]">📱 {s.phone}</p>
                    )}
                    <p className="text-xs text-[var(--muted-warm)]">Since: <span className="font-semibold text-[var(--ink)]">{new Date(s.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span></p>

                    {/* Action row */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <button onClick={() => setProfileOf(s)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--gold-pale)] text-[var(--brown)] hover:bg-[var(--hover-warm)]">
                        👁 Profile
                      </button>
                      {s.phone && (
                        <a href={`tel:${s.phone}`}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 hover:bg-green-100">
                          📞 Call
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100">
                          ✉ Email
                        </a>
                      )}

                      {/* Role dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setEditingRole(editingRole?.id === s.id ? null : { id: s.id, role: s.role })}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--maroon-deep)]/5 text-[var(--maroon-deep)] hover:bg-[var(--maroon-deep)]/10 flex items-center gap-1">
                          <Shield size={9} /> Role <ChevronDown size={9} />
                        </button>
                        {editingRole?.id === s.id && (
                          <div className="absolute left-0 top-8 z-20 bg-white rounded-xl shadow-2xl border border-[var(--border-warm)] py-1 w-44">
                            {Object.entries(ROLE_DISPLAY).map(([key, label]) => (
                              <button key={key} onClick={() => updateRole(s.id, key)}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--hover-warm)] transition-colors ${s.role === key ? "font-bold text-[var(--maroon-deep)]" : "text-[var(--ink)]"}`}>
                                {label} {s.role === key && "✓"}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setDeleteConfirm(s.id)}
                    className="p-1 text-[var(--muted-warm)] hover:text-red-500 shrink-0 mt-0.5">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending role assignment section */}
          {pendingUsers.length > 0 && (
            <div>
              <h2 className="font-bold text-[var(--maroon-deep)] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Pending Role Assignment ({pendingUsers.length})
              </h2>
              <p className="text-xs text-[var(--muted-warm)] mb-4">These users have logged in but haven&apos;t been assigned a role yet. Assign a role to give them access.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {pendingUsers.map((u) => (
                  <div key={u.supabaseId}
                    className="card-warm p-4 border-l-4 flex gap-3 items-start"
                    style={{ borderLeftColor: "#E8920A" }}>
                    <div className="w-10 h-10 rounded-full bg-amber-50 border-2 border-amber-300 grid place-items-center font-bold text-sm text-amber-700 shrink-0">
                      {u.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--ink)] truncate">{u.name}</p>
                      {u.email && <p className="text-xs text-[var(--muted-warm)] truncate">{u.email}</p>}
                      <p className="text-[10px] text-[var(--muted-warm)] mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                      <button onClick={() => { setAssigningPending(u); setAssignName(u.name); setAssignRole("snacks_staff"); setAssignSection(""); setAssignPhone(""); }}
                        className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg btn-amber">
                        Assign Role →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />

      {/* Profile popup */}
      {profileOf && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-warm)]">
              <h3 className="font-bold text-[var(--maroon-deep)]">Staff Profile</h3>
              <button onClick={() => setProfileOf(null)} className="p-1 text-[var(--muted-warm)]"><X size={18} /></button>
            </div>
            <div className="px-5 py-5 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full grid place-items-center font-bold text-xl text-white shadow-lg"
                style={{ background: ROLE_COLORS[profileOf.role] ?? "#4A1414" }}>
                {profileOf.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="text-center">
                <p className="font-bold text-lg text-[var(--maroon-deep)]">{profileOf.name}</p>
                <span className={`inline-block text-xs px-3 py-0.5 rounded-full font-semibold mt-1 ${ROLE_BADGE[profileOf.role] ?? ""}`}>
                  {ROLE_DISPLAY[profileOf.role] ?? profileOf.role}
                </span>
              </div>
              <div className="w-full space-y-2 text-sm">
                {profileOf.email && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--gold-bg)] rounded-lg">
                    <Mail size={14} className="text-[var(--muted-warm)] shrink-0" />
                    <span className="text-[var(--ink)] truncate">{profileOf.email}</span>
                  </div>
                )}
                {profileOf.phone && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--gold-bg)] rounded-lg">
                    <Phone size={14} className="text-[var(--muted-warm)] shrink-0" />
                    <span className="text-[var(--ink)]">{profileOf.phone}</span>
                  </div>
                )}
                {profileOf.section && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--gold-bg)] rounded-lg">
                    <span className="text-[var(--muted-warm)] text-xs w-3.5 shrink-0">§</span>
                    <span className="text-[var(--ink)] capitalize">Section: {profileOf.section}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-[var(--gold-bg)] rounded-lg">
                  <span className="text-[var(--muted-warm)] text-xs w-3.5 shrink-0">📅</span>
                  <span className="text-[var(--ink)]">Member since {new Date(profileOf.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              {profileOf.phone && (
                <a href={`tel:${profileOf.phone}`}
                  className="flex-1 h-10 rounded-xl bg-green-50 text-green-700 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Phone size={14} /> Call
                </a>
              )}
              {profileOf.email && (
                <a href={`mailto:${profileOf.email}`}
                  className="flex-1 h-10 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Mail size={14} /> Email
                </a>
              )}
              <button onClick={() => setProfileOf(null)}
                className="flex-1 h-10 rounded-xl border border-[var(--border-warm)] text-sm text-[var(--muted-warm)]">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign pending user popup */}
      {assigningPending && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAssigningPending(null)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[var(--border-warm)]" /></div>
            <div className="px-5 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl text-[var(--maroon-deep)]">Assign Role</h2>
                  <p className="text-xs text-[var(--muted-warm)]">{assigningPending.email}</p>
                </div>
                <button onClick={() => setAssigningPending(null)} className="p-1 text-[var(--muted-warm)]"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1 uppercase tracking-wide">Name *</label>
                  <input value={assignName} onChange={e => setAssignName(e.target.value)}
                    className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1 uppercase tracking-wide">Role *</label>
                    <select value={assignRole} onChange={e => setAssignRole(e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none">
                      {Object.entries(ROLE_DISPLAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1 uppercase tracking-wide">Section</label>
                    <select value={assignSection} onChange={e => setAssignSection(e.target.value)}
                      className="w-full h-11 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none">
                      <option value="">— None —</option>
                      <option value="snacks">Snacks</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1 uppercase tracking-wide">Phone</label>
                  <input value={assignPhone} onChange={e => setAssignPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                    placeholder="9876543210" inputMode="numeric"
                    className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none" />
                </div>
                <button onClick={assignPendingUser} disabled={saving || !assignName || !assignRole}
                  className="btn-amber w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 mt-2">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Assigning…</> : "Confirm Role Assignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[var(--border-warm)]" /></div>
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
                      className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none" />
                    <p className="text-[10px] text-[var(--muted-warm)] mt-0.5">{form.username ? `${form.username}@abhinandan.in` : "username@abhinandan.in"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Password *</label>
                    <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Role *</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full h-11 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none">
                      {Object.entries(ROLE_DISPLAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Section</label>
                    <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                      className="w-full h-11 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none">
                      <option value="">— None —</option>
                      <option value="snacks">Snacks</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="9876543210" inputMode="numeric"
                    className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:outline-none" />
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
