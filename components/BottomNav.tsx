'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Coffee, ClipboardList, Wifi } from "lucide-react";

const tabs = [
  { href: "/dashboard",   label: "Overview", icon: LayoutDashboard },
  { href: "/counter",     label: "Snacks",   icon: UtensilsCrossed },
  { href: "/tea-entry",   label: "Tea",      icon: Coffee },
  { href: "/tea-monitor", label: "Monitor",  icon: Wifi },
  { href: "/orders",      label: "Orders",   icon: ClipboardList },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t-2 border-[var(--amber-brand)] lg:hidden h-[60px] flex">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href + tab.label}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold tracking-wide uppercase transition-colors ${
              active ? "text-[var(--maroon-deep)]" : "text-[var(--muted-warm)]"
            }`}
          >
            <Icon size={19} strokeWidth={active ? 2.5 : 1.5} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
