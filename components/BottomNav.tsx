'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, ClipboardList } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const tabs = [
  { href: "/dashboard",   label: "Overview", icon: LayoutDashboard, roles: ["owner"] },
  { href: "/counter",     label: "Snacks",   icon: UtensilsCrossed, roles: ["owner", "snacks_staff"] },
  { href: "/orders",      label: "Orders",   icon: ClipboardList,   roles: ["owner"] },
];

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("owner");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setRole(data.user.user_metadata?.role || "owner");
      }
    });
  }, []);

  // Filter tabs by user's role
  const visibleTabs = tabs.filter(tab => tab.roles.includes(role));

  if (visibleTabs.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t-2 border-[var(--amber-brand)] lg:hidden h-[60px] flex">
      {visibleTabs.map((tab) => {
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
