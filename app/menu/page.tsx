'use client';

import { useEffect, useRef, useState } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, X, ImageIcon, UtensilsCrossed } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

type Section = "snacks" | "tea";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  section: Section;
  available: boolean;
  imageUrl: string | null;
};

const SNACK_CATS = ["Fried", "Rolls", "Sandwiches", "Sweets", "Specials"];
const TEA_CATS   = ["Tea", "Coffee", "Lassi", "Juice", "Shakes", "Drinks"];
const ALL_CATS   = [...SNACK_CATS, ...TEA_CATS];

const SECTION_EMOJI: Record<Section, string> = { snacks: "🍟", tea: "☕" };

type FormState = {
  id?: string;
  name: string;
  price: string;
  category: string;
  section: Section;
  imageUrl: string;
  imageFile: File | null;
  available: boolean;
};

const BLANK: FormState = {
  name: "", price: "", category: "Fried", section: "snacks",
  imageUrl: "", imageFile: null, available: true,
};

export default function MenuPage() {
  const [items, setItems]       = useState<MenuItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [tab, setTab]           = useState<"All" | Section>("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<FormState>(BLANK);
  const [saving, setSaving]     = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => {
    const matchTab = tab === "All" || i.section === tab;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const openAdd = () => { setForm(BLANK); setShowForm(true); };
  const openEdit = (item: MenuItem) => {
    setForm({
      id: item.id,
      name: item.name,
      price: String(item.price),
      category: item.category,
      section: item.section,
      imageUrl: item.imageUrl || "",
      imageFile: null,
      available: item.available,
    });
    setShowForm(true);
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, imageFile: file, imageUrl: URL.createObjectURL(file) }));
  };

  const toggleAvail = async (item: MenuItem) => {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, available: !i.available } : i));
    await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, available: !item.available }),
    }).catch(() => { load(); });
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
    await fetch(`/api/menu?id=${id}`, { method: "DELETE" }).catch(() => { load(); });
  };

  const save = async () => {
    if (!form.name.trim() || !form.price || Number(form.price) <= 0) return;
    setSaving(true);

    try {
      let imageUrl = form.imageUrl;

      // Upload new image if a file was picked
      if (form.imageFile) {
        setUploadPct(0);
        const fd = new FormData();
        fd.append("file", form.imageFile);
        const res = await fetch("/api/menu/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (d.url) imageUrl = d.url;
        setUploadPct(null);
      }

      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        section: form.section,
        imageUrl: imageUrl || null,
        available: form.available,
      };

      if (form.id) {
        // Update
        const res = await fetch("/api/menu", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: form.id, ...payload }),
        });
        const d = await res.json();
        if (d.item) {
          setItems((prev) => prev.map((i) => i.id === form.id ? d.item : i));
        }
      } else {
        // Create
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (d.item) {
          setItems((prev) => [d.item, ...prev]);
        }
      }

      setShowForm(false);
    } catch {
      alert("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Menu Management</h1>
              <p className="text-xs text-[var(--muted-warm)]">{filtered.length} items</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-warm)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-9 pl-8 pr-3 text-sm bg-white border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] outline-none w-36"
                />
              </div>
              <button onClick={openAdd} className="btn-amber h-9 px-4 text-sm flex items-center gap-1.5 rounded-lg">
                <Plus size={14} /> Add Item
              </button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 mt-3">
            {(["All", "snacks", "tea"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 h-8 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: tab === t ? "var(--maroon-deep)" : "white",
                  color: tab === t ? "var(--gold-pale)" : "var(--muted-warm)",
                  border: `1px solid ${tab === t ? "var(--maroon-deep)" : "var(--border-warm)"}`,
                }}>
                {t === "All" ? "All" : t === "snacks" ? "🍟 Snacks" : "☕ Tea & Drinks"}
              </button>
            ))}
          </div>
        </header>

        {/* Grid */}
        <div className="p-4 lg:p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="text-[var(--amber-brand)] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((item) => (
                <div key={item.id}
                  className={`card-warm overflow-hidden transition-opacity ${!item.available ? "opacity-50" : ""}`}>

                  {/* Image */}
                  <div className="relative aspect-square bg-[var(--gold-pale)]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        {SECTION_EMOJI[item.section]}
                      </div>
                    )}

                    {/* Availability badge */}
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {item.available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-semibold text-sm text-[var(--ink)] truncate">{item.name}</p>
                    <p className="text-[10px] text-[var(--muted-warm)] capitalize">{item.category}</p>
                    <p className="font-bold text-[var(--amber-brand)] mt-0.5">₹{item.price}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 mt-3">
                      {/* Toggle */}
                      <button onClick={() => toggleAvail(item)}
                        className="flex-1 h-7 rounded-lg text-[10px] font-semibold transition-colors"
                        style={{
                          background: item.available ? "#FFF3E0" : "#F0FFF4",
                          color: item.available ? "#E65100" : "#1A6B3A",
                          border: `1px solid ${item.available ? "#FFB74D" : "#A7E6C0"}`,
                        }}>
                        {item.available ? "Mark Off" : "Mark On"}
                      </button>

                      <button onClick={() => openEdit(item)}
                        className="w-7 h-7 rounded-lg bg-[var(--gold-pale)] text-[var(--brown)] grid place-items-center hover:bg-[var(--hover-warm)]">
                        <Pencil size={12} />
                      </button>

                      <button onClick={() => setDeleteConfirm(item.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-500 grid place-items-center hover:bg-red-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && !loading && (
                <div className="col-span-full text-center py-16 text-[var(--muted-warm)]">
                  {search ? `No items match "${search}"` : "No items yet — tap Add Item"}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNav />

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-[var(--maroon-deep)] text-lg mb-2">Delete item?</h3>
            <p className="text-sm text-[var(--muted-warm)] mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-10 rounded-lg border border-[var(--border-warm)] text-sm text-[var(--muted-warm)]">
                Cancel
              </button>
              <button onClick={() => deleteItem(deleteConfirm)}
                className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setShowForm(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Drawer handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--border-warm)]" />
            </div>

            <div className="px-5 pb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl text-[var(--maroon-deep)]">
                  {form.id ? "Edit Item" : "Add New Item"}
                </h2>
                <button onClick={() => !saving && setShowForm(false)}
                  className="p-1 text-[var(--muted-warm)] hover:text-[var(--brown)]">
                  <X size={20} />
                </button>
              </div>

              {/* Image upload */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--ink)] mb-2 uppercase tracking-wide">Product Photo</p>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full h-36 rounded-xl border-2 border-dashed border-[var(--border-warm)] bg-[var(--gold-pale)]/40 flex flex-col items-center justify-center gap-2 overflow-hidden hover:bg-[var(--gold-pale)]/60 transition-colors">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <ImageIcon size={28} className="text-[var(--muted-warm)]" />
                      <span className="text-xs text-[var(--muted-warm)]">Tap to upload photo</span>
                      <span className="text-[10px] text-[var(--muted-warm)]/60">JPG, PNG, WebP · max 5 MB</span>
                    </>
                  )}
                </button>
                {form.imageUrl && (
                  <button onClick={() => setForm((f) => ({ ...f, imageUrl: "", imageFile: null }))}
                    className="mt-1 text-xs text-red-500 hover:underline">
                    Remove photo
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
                {uploadPct !== null && (
                  <p className="text-xs text-[var(--muted-warm)] mt-1">Uploading…</p>
                )}
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Masala Chai"
                  className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none"
                />
              </div>

              {/* Price */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Price (₹) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  min={1}
                  className="w-full h-11 px-4 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none"
                />
              </div>

              {/* Section + Category row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Section *</label>
                  <select
                    value={form.section}
                    onChange={(e) => {
                      const s = e.target.value as Section;
                      setForm((f) => ({
                        ...f,
                        section: s,
                        category: s === "snacks" ? "Fried" : "Tea",
                      }));
                    }}
                    className="w-full h-11 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none"
                  >
                    <option value="snacks">🍟 Snacks</option>
                    <option value="tea">☕ Tea & Drinks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5 uppercase tracking-wide">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full h-11 px-3 bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-lg text-[var(--ink)] focus:border-[var(--brown)] focus:outline-none"
                  >
                    {(form.section === "snacks" ? SNACK_CATS : TEA_CATS).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Available toggle */}
              <div className="flex items-center justify-between mb-6 p-3 bg-[var(--gold-pale)]/40 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Available on menu</p>
                  <p className="text-xs text-[var(--muted-warm)]">Customers can order this item</p>
                </div>
                <button onClick={() => setForm((f) => ({ ...f, available: !f.available }))}
                  className="w-12 h-6 rounded-full relative transition-colors shrink-0"
                  style={{ background: form.available ? "var(--success-brand)" : "var(--border-warm)" }}>
                  <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: form.available ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>

              {/* Save button */}
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.price || Number(form.price) <= 0}
                className="btn-amber w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : form.id ? "Save Changes" : "Add to Menu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
