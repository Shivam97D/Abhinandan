'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coffee, UtensilsCrossed, IndianRupee, ShoppingBag, Users, ArrowUp, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from "recharts";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { revenueWeek, hourlyOrders, topItems } from "@/lib/mock-data";

// Section Manager sees their own section only (tea OR snacks)
// In production, section is read from the logged-in user's profile
const DEMO_SECTION: "tea" | "snacks" = "snacks";

const SECTION_META = {
  tea: {
    label: "Tea Section",
    icon: Coffee,
    color: "#4A1414",
    revenue: 1640,
    orders: 82,
    topItem: "Cutting Chai",
    staff: [
      { name: "Sunita Patil", shift: "Morning", orders: 45, revenue: 900 },
      { name: "Kavita Shinde", shift: "Evening", orders: 37, revenue: 740 },
    ],
  },
  snacks: {
    label: "Snacks Section",
    icon: UtensilsCrossed,
    color: "#E8920A",
    revenue: 2640,
    orders: 52,
    topItem: "Samosa",
    staff: [
      { name: "Ramesh Kumar", shift: "Morning", orders: 28, revenue: 1380 },
      { name: "Prakash More", shift: "Evening", orders: 24, revenue: 1260 },
    ],
  },
};

export default function SectionDashboard() {
  const [now, setNow] = useState(new Date());
  const section = DEMO_SECTION;
  const meta = SECTION_META[section];
  const SectionIcon = meta.icon;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

      {/* Header */}
      <header className="sticky top-0 z-10 heritage-texture border-b border-[var(--border-warm)] px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--maroon-deep)" }}>
        <div className="flex items-center gap-3">
          <div className="lg:hidden"><Logo variant="light" size={22} /></div>
          <div>
            <h1 className="font-display text-lg text-[var(--gold-pale)] leading-none">{meta.label}</h1>
            <p className="text-xs text-[var(--gold-pale)]/50">
              {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              {" · "}{now.toLocaleTimeString("en-IN")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SectionIcon size={18} style={{ color: meta.color === "#4A1414" ? "#F5D79E" : meta.color }} />
          <Link href="/login" className="text-xs text-[var(--gold-pale)]/50 hover:text-[var(--gold-pale)] transition-colors">
            Sign out
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Revenue",  value: `₹${meta.revenue.toLocaleString("en-IN")}`, icon: IndianRupee,  trend: "+8%" },
            { label: "Orders",   value: String(meta.orders),                         icon: ShoppingBag,  trend: "+5 vs yesterday" },
            { label: "Top Item", value: meta.topItem,                                icon: TrendingUp,   trend: "" },
            { label: "Staff",    value: `${meta.staff.length} on duty`,             icon: Users,        trend: "" },
          ].map((k) => (
            <div key={k.label} className="card-warm p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <k.icon size={14} className="text-[var(--amber-brand)]" />
                <p className="text-xs text-[var(--muted-warm)] uppercase tracking-wide">{k.label}</p>
              </div>
              <p className="font-display text-lg text-[var(--maroon-deep)] leading-none">{k.value}</p>
              {k.trend && (
                <p className="text-[10px] text-[var(--success-brand)] flex items-center gap-0.5 mt-1">
                  <ArrowUp size={10} /> {k.trend}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="card-warm p-5">
          <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4">Revenue This Week</h3>
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={revenueWeek}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={meta.color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-warm)" />
                <XAxis dataKey="day" stroke="var(--muted-warm)" fontSize={11} />
                <YAxis stroke="var(--muted-warm)" fontSize={11} />
                <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${meta.color}`, borderRadius: 8 }}
                  formatter={(v: unknown) => `₹${v}`} />
                <Area
                  type="monotone"
                  dataKey={section === "tea" ? "tea" : "snacks"}
                  stroke={meta.color}
                  fill="url(#sg)"
                  strokeWidth={2}
                  name={meta.label}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak hours + top items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-warm p-5">
            <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4">Peak Hours</h3>
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={hourlyOrders}>
                  <XAxis dataKey="hour" stroke="var(--muted-warm)" fontSize={10} interval={2} />
                  <YAxis stroke="var(--muted-warm)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#fff", borderRadius: 8 }} />
                  <Bar dataKey="orders" fill={meta.color} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-warm p-5">
            <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4">Top Items</h3>
            <div className="space-y-3">
              {topItems.slice(0, 5).map((it, i) => (
                <div key={it.name} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--muted-warm)] w-4">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold text-[var(--ink)] truncate">{it.name}</span>
                      <span className="text-[var(--muted-warm)] shrink-0 ml-2">₹{it.revenue}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--border-warm)] rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${(it.revenue / 800) * 100}%`, background: meta.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff performance */}
        <div className="card-warm p-5">
          <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4 flex items-center gap-2">
            <Users size={15} className="text-[var(--amber-brand)]" /> Staff Performance Today
          </h3>
          <div className="divide-y divide-[var(--border-warm)]">
            {meta.staff.map((s) => (
              <div key={s.name} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-[var(--maroon-deep)]/10 grid place-items-center font-bold text-sm text-[var(--maroon-deep)] shrink-0">
                  {s.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-[var(--ink)]">{s.name}</p>
                  <p className="text-xs text-[var(--muted-warm)]">{s.shift} Shift · {s.orders} orders</p>
                </div>
                <p className="font-bold text-[var(--amber-brand)] text-sm">₹{s.revenue}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={section === "tea" ? "/tea-entry" : "/counter"}
            className="btn-amber h-12 flex items-center justify-center gap-2 font-semibold text-sm rounded-xl"
          >
            <SectionIcon size={16} /> Open Counter
          </Link>
          <Link
            href="/tea-monitor"
            className="h-12 flex items-center justify-center gap-2 font-semibold text-sm rounded-xl border-2 border-[var(--amber-brand)] text-[var(--amber-brand)] hover:bg-[var(--amber-brand)] hover:text-[var(--maroon-deep)] transition-colors"
          >
            <TrendingUp size={16} /> Live Monitor
          </Link>
        </div>

      </div>
      </main>
      <BottomNav />
    </div>
  );
}
