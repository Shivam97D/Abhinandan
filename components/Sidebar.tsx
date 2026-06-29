'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList,
  BookOpen, BarChart3, Users, Settings, LogOut, Menu, X, ChefHat,
} from "lucide-react";
import { Logo } from "./Logo";
import { useLogout } from "@/hooks/useLogout";
import { createClient } from "@/utils/supabase/client";

const items = [
  { href: "/dashboard",        label: "Dashboard",       icon: LayoutDashboard, roles: ["owner"] },
  { href: "/counter",          label: "Snacks POS",      icon: UtensilsCrossed, roles: ["owner", "snacks_staff"] },
  { href: "/serving",          label: "Serving Console",  icon: ChefHat,         roles: ["owner", "section_manager"] },
  { href: "/orders",           label: "Orders",          icon: ClipboardList,   roles: ["owner"] },
  { href: "/menu",             label: "Menu",            icon: BookOpen,        roles: ["owner"] },
  { href: "/reports",          label: "Reports",         icon: BarChart3,       roles: ["owner"] },
  { href: "/staff",            label: "Staff",           icon: Users,           roles: ["owner"] },
  { href: "/settings",         label: "Settings",        icon: Settings,        roles: ["owner"] },
];

function NavLinks({ pathname, onNavigate, role }: { pathname: string; onNavigate?: () => void; role: string }) {
  const filtered = items.filter(it => it.roles.includes(role));
  return (
    <>
      {filtered.map((it) => {
        const active = pathname === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active
                ? "bg-[var(--amber-brand)] text-[var(--maroon-deep)] shadow-sm"
                : "text-[var(--gold-pale)]/75 hover:bg-white/8 hover:text-[var(--gold-pale)]"
            }`}
          >
            <Icon size={16} strokeWidth={active ? 2.2 : 1.5} />
            {it.label}
          </Link>
        );
      })}
    </>
  );
}

function UserFooter({ name, role }: { name: string; role: string }) {
  const logout = useLogout();
  const displayRole = role === "owner" ? "Owner" : role === "section_manager" ? "Manager" : role;
  return (
    <div className="p-4 border-t border-white/10 flex items-center gap-3 shrink-0">
      <div className="w-8 h-8 rounded-full bg-[var(--amber-brand)] text-[var(--maroon-deep)] grid place-items-center font-bold text-sm shrink-0 uppercase">
        {name ? name[0] : "A"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-[var(--gold-pale)] capitalize">{name || "Abhinandan"}</p>
        <p className="text-[11px] text-[var(--gold-pale)]/40">{displayRole}</p>
      </div>
      <button
        onClick={async (e) => {
          e.preventDefault();
          await logout();
        }}
        className="text-[var(--gold-pale)]/40 hover:text-[var(--gold-pale)] transition-colors p-1.5 rounded-lg hover:bg-white/10 flex items-center justify-center"
        title="Sign out"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserProfile({
          name: data.user.user_metadata?.name || "Owner",
          role: data.user.user_metadata?.role || "owner"
        });
      }
    });
  }, []);

  const currentRole = userProfile?.role || "owner";
  const currentName = userProfile?.name || "Owner";

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-xl bg-[var(--maroon-deep)] shadow-lg flex items-center justify-center border border-white/10"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={18} className="text-[var(--gold-pale)]" />
      </button>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[var(--maroon-deep)] heritage-texture text-[var(--gold-pale)] shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <Logo variant="light" size={22} />
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-[var(--gold-pale)]/50 hover:text-[var(--gold-pale)] hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} role={currentRole} />
        </nav>
        <UserFooter name={currentName} role={currentRole} />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-[var(--maroon-deep)] heritage-texture text-[var(--gold-pale)] h-screen sticky top-0 z-30">
        <div className="px-6 py-5 border-b border-white/10">
          <Logo variant="light" size={24} />
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <NavLinks pathname={pathname} role={currentRole} />
        </nav>
        <UserFooter name={currentName} role={currentRole} />
      </aside>
    </>
  );
}
