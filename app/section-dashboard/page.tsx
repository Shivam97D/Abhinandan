'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coffee, UtensilsCrossed, IndianRupee, ShoppingBag, Users, ArrowUp, TrendingUp, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from "recharts";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

type UserProfile = { name: string; role: string; section: string | null };
type TopItem = { id: string; name: string; section: string; qty: number; revenue: number };
type ChartDay = { day: string; tea: number; snacks: number; orders: number };
type HourlyPoint = { hour: string; orders: number };
type StaffMember = { id: string; name: string; role: string; section: string | null; _count?: { teaEntries: number } };

type AnalyticsData = {
  teaRevenue: number;
  snacksRevenue: number;
  orderCount: number;
  topItems: TopItem[];
  chartData: ChartDay[];
  hourlyData: HourlyPoint[];
  peakHour: string;
  peakHourCount: number;
};

const PERIOD_OPTIONS = ["Today", "Week", "Month"] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

export default function SectionDashboard() {
  const [now, setNow] = useState(new Date());
  const [period, setPeriod] = useState<Period>("Today");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/users/me").then(r => r.json()).then(d => setUser(d.user ?? null)).catch(() => {}),
      fetch("/api/staff").then(r => r.json()).then(d => setStaff(d.staff || [])).catch(() => {}),
    ]).finally(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?period=${period.toLowerCase()}`)
      .then(r => r.json())
      .then(d => setAnalytics(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const section = (user?.section ?? "snacks") as "tea" | "snacks";
  const sectionRevenue = analytics ? (section === "tea" ? analytics.teaRevenue : analytics.snacksRevenue) : 0;
  const sectionColor = section === "tea" ? "#4A1414" : "#E8920A";
  const SectionIcon = section === "tea" ? Coffee : UtensilsCrossed;
  const sectionLabel = section === "tea" ? "Tea Section" : "Snacks Section";

  const sectionStaff = staff.filter(s => s.section === section);

  const sectionItems = analytics?.topItems
    .filter(it => it.section === section)
    .slice(0, 5) ?? [];

  const maxItemRev = sectionItems[0]?.revenue ?? 1;

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 border-b border-[var(--border-warm)] px-4 py-3 flex items-center justify-between"
          style={{ background: "var(--maroon-deep)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 lg:hidden shrink-0" />
            <div>
              <h1 className="font-display text-lg text-[var(--gold-pale)] leading-none">{sectionLabel}</h1>
              <p className="text-xs text-[var(--gold-pale)]/50">
                {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                {" · "}{now.toLocaleTimeString("en-IN")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SectionIcon size={18} style={{ color: section === "tea" ? "#F5D79E" : sectionColor }} />
            <Link href="/login" className="text-xs text-[var(--gold-pale)]/50 hover:text-[var(--gold-pale)] transition-colors">
              Sign out
            </Link>
          </div>
        </header>

        <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

          {/* Period selector */}
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 h-8 rounded-full text-xs font-semibold transition-colors ${
                  period === p
                    ? "text-white"
                    : "bg-white border border-[var(--border-warm)] text-[var(--muted-warm)] hover:bg-[var(--gold-bg)]"
                }`}
                style={period === p ? { background: sectionColor } : {}}>
                {p}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[var(--amber-brand)]" />
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Revenue",  value: `₹${sectionRevenue.toLocaleString("en-IN")}`, icon: IndianRupee,  trend: analytics ? `${((sectionRevenue / Math.max(analytics.teaRevenue + analytics.snacksRevenue, 1)) * 100).toFixed(0)}% of total` : "" },
                  { label: "Orders",   value: String(analytics?.orderCount ?? 0),            icon: ShoppingBag,  trend: period === "Today" ? "today" : "" },
                  { label: "Top Item", value: sectionItems[0]?.name ?? "—",                  icon: TrendingUp,   trend: sectionItems[0] ? `${sectionItems[0].qty} sold` : "" },
                  { label: "Staff",    value: `${sectionStaff.length} members`,              icon: Users,        trend: "" },
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
              {analytics && analytics.chartData.length > 0 && (
                <div className="card-warm p-5">
                  <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4">
                    Revenue — {period}
                  </h3>
                  <div className="h-52">
                    <ResponsiveContainer>
                      <AreaChart data={analytics.chartData}>
                        <defs>
                          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={sectionColor} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={sectionColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-warm)" />
                        <XAxis dataKey={"day" in (analytics.chartData[0] ?? {}) ? "day" : "week"} stroke="var(--muted-warm)" fontSize={11} />
                        <YAxis stroke="var(--muted-warm)" fontSize={11} />
                        <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${sectionColor}`, borderRadius: 8 }}
                          formatter={(v: unknown) => `₹${v}`} />
                        <Area
                          type="monotone"
                          dataKey={section}
                          stroke={sectionColor}
                          fill="url(#sg)"
                          strokeWidth={2}
                          name={sectionLabel}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Peak hours + top items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics && (
                  <div className="card-warm p-5">
                    <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-1">Peak Hours</h3>
                    <p className="text-xs text-[var(--muted-warm)] mb-3">Peak: {analytics.peakHour} ({analytics.peakHourCount} orders)</p>
                    <div className="h-44">
                      <ResponsiveContainer>
                        <BarChart data={analytics.hourlyData}>
                          <XAxis dataKey="hour" stroke="var(--muted-warm)" fontSize={10} interval={2} />
                          <YAxis stroke="var(--muted-warm)" fontSize={10} />
                          <Tooltip contentStyle={{ background: "#fff", borderRadius: 8 }} />
                          <Bar dataKey="orders" fill={sectionColor} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="card-warm p-5">
                  <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4">Top Items</h3>
                  {sectionItems.length === 0 ? (
                    <p className="text-xs text-[var(--muted-warm)] text-center py-8">No orders yet this period</p>
                  ) : (
                    <div className="space-y-3">
                      {sectionItems.map((it, i) => (
                        <div key={it.id} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--muted-warm)] w-4">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-semibold text-[var(--ink)] truncate">{it.name}</span>
                              <span className="text-[var(--muted-warm)] shrink-0 ml-2">₹{it.revenue}</span>
                            </div>
                            <div className="h-1.5 bg-[var(--border-warm)] rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${(it.revenue / maxItemRev) * 100}%`, background: sectionColor }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Staff */}
              {sectionStaff.length > 0 && (
                <div className="card-warm p-5">
                  <h3 className="font-bold text-[var(--maroon-deep)] text-sm mb-4 flex items-center gap-2">
                    <Users size={15} className="text-[var(--amber-brand)]" /> Section Staff
                  </h3>
                  <div className="divide-y divide-[var(--border-warm)]">
                    {sectionStaff.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 py-3">
                        <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-sm text-white shrink-0"
                          style={{ background: sectionColor }}>
                          {s.name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-[var(--ink)]">{s.name}</p>
                          <p className="text-xs text-[var(--muted-warm)] capitalize">{s.role.replace(/_/g, " ")}</p>
                        </div>
                        {s._count && s._count.teaEntries > 0 && (
                          <p className="text-xs font-semibold text-[var(--amber-brand)]">{s._count.teaEntries} entries</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

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
