'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Coffee, UtensilsCrossed, ClipboardList,
  BookOpen, BarChart3, Users, Settings, LogOut, Wifi,
} from "lucide-react";
import { Logo } from "./Logo";

const items = [
  { href: "/dashboard",       label: "Dashboard",    icon: LayoutDashboard },
  { href: "/tea-entry",       label: "Tea Counter",  icon: Coffee },
  { href: "/counter",         label: "Snacks POS",   icon: UtensilsCrossed },
  { href: "/tea-monitor",     label: "Tea Monitor",  icon: Wifi },
  { href: "/orders",          label: "Orders",       icon: ClipboardList },
  { href: "/menu",            label: "Menu",         icon: BookOpen },
  { href: "/reports",         label: "Reports",      icon: BarChart3 },
  { href: "/staff",           label: "Staff",        icon: Users },
  { href: "/settings",        label: "Settings",     icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-[var(--maroon-deep)] heritage-texture text-[var(--gold-pale)] min-h-screen sticky top-0 z-30">
      <div className="px-6 py-5 border-b border-white/10">
        <Logo variant="light" size={24} />
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const active = pathname === it.href;
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
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
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--amber-brand)] text-[var(--maroon-deep)] grid place-items-center font-bold text-sm shrink-0">
          S
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-[var(--gold-pale)]">Suresh Patil</p>
          <p className="text-[11px] text-[var(--gold-pale)]/40">Owner</p>
        </div>
        <Link href="/login" className="text-[var(--gold-pale)]/40 hover:text-[var(--gold-pale)] transition-colors" title="Sign out">
          <LogOut size={15} />
        </Link>
      </div>
    </aside>
  );
}
