'use client';

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  IndianRupee, ShoppingBag, Clock, Ticket, Bell, ArrowUp, ArrowDown,
  Lightbulb, TrendingUp, Share2, AlertTriangle, Coffee, UtensilsCrossed, X, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";

const MAROON  = "#4A1414";
const AMBER   = "#E8920A";
const SUCCESS = "#1A6B3A";

type Period = "Today" | "Week" | "Month";

type AnalyticsData = {
  totalRevenue: number;
  orderCount: number;
  avgOrder: number;
  teaRevenue: number;
  snacksRevenue: number;
  paymentSplit: Record<string, number>;
  topItems: { id: string; name: string; qty: number; revenue: number }[];
  hourlyData: { hour: string; orders: number }[];
  chartData: Record<string, unknown>[];
  peakHour: string;
  peakHourCount: number;
  pendingTokenCount: number;
  liveQueue: { id: string; tokenNumber: number; status: string; paymentMethod: string | null; total: number; items: string }[];
  recentOrders: { id: string; tokenNumber: string; source: string; items: string; amount: number; paymentMethod: string; status: string; tokenStatus: string | null; time: string }[];
  insights: string[];
  teaCupCount: number;
  teaStatsToday: { morning: { cups: number; amount: number }; evening: { cups: number; amount: number } };
  yesterdayRevenue: number | null;
  revenueVsYesterday: { amount: number; positive: boolean } | null;
};

type UserProfile = { id: string; name: string; role: string; section: string | null };

const EMPTY: AnalyticsData = {
  totalRevenue: 0, orderCount: 0, avgOrder: 0, teaRevenue: 0, snacksRevenue: 0,
  paymentSplit: {}, topItems: [], hourlyData: [], chartData: [], peakHour: "—",
  peakHourCount: 0, pendingTokenCount: 0, liveQueue: [], recentOrders: [],
  insights: ["No data yet", "No data yet", "No data yet"],
  teaCupCount: 0, teaStatsToday: { morning: { cups: 0, amount: 0 }, evening: { cups: 0, amount: 0 } },
  yesterdayRevenue: null, revenueVsYesterday: null,
};

const TOKEN_STATUS_COLORS: Record<string, string> = {
  awaiting_payment: "bg-orange-100 text-orange-700",
  pending: "bg-amber-100 text-amber-700",
  preparing: "bg-red-100 text-red-700",
  ready: "bg-[var(--amber-brand)] text-white",
  served: "bg-green-100 text-green-700",
};

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [period, setPeriod] = useState<Period>("Today");
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showBell, setShowBell] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/users/me").then(r => r.json()).then(d => { if (d.user) setUser(d.user); }).catch(() => {});
  }, []);

  const loadData = useCallback((p: Period, isInitial = false) => {
    if (isInitial) setLoading(true); else setRefreshing(true);
    fetch(`/api/analytics?period=${p}`)
      .then(r => r.json())
      .then(d => setData(d as AnalyticsData))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { loadData(period, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriod = (p: Period) => {
    setPeriod(p);
    loadData(p, false);
  };

  const pieData = [
    { name: "Tea",    value: data.teaRevenue,    color: MAROON },
    { name: "Snacks", value: data.snacksRevenue, color: AMBER },
  ];

  const paymentData = Object.entries(data.paymentSplit).map(([name, value], i) => ({
    name, value, color: i % 2 === 0 ? MAROON : AMBER,
  }));

  const maxOrders = data.hourlyData.length ? Math.max(...data.hourlyData.map(d => d.orders)) : 0;

  const chartDataKey = period === "Today" ? "orders" : null;
  const xKey = period === "Month"
    ? "week"
    : period === "Week"
    ? "day"
    : "hour";

  const shareReport = () => {
    const text = `*Abhinandan ${period} Summary*\n📅 ${now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}\n\n💰 Revenue: ₹${data.totalRevenue.toLocaleString("en-IN")}\n   ☕ Tea: ₹${data.teaRevenue.toLocaleString("en-IN")}\n   🍟 Snacks: ₹${data.snacksRevenue.toLocaleString("en-IN")}\n\n📦 Orders: ${data.orderCount} (Avg ₹${data.avgOrder})\n🏆 Top Item: ${data.topItems[0]?.name ?? "—"} (${data.topItems[0]?.qty ?? 0} units)\n⏰ Peak Hour: ${data.peakHour}\n\n_Sent from Abhinandan App_`;
    if (navigator.share) navigator.share({ text });
    else navigator.clipboard.writeText(text);
  };

  const bellCount = Math.min(data.pendingTokenCount, 9);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-[var(--gold-bg)]">
        <Sidebar />
        <main className="flex-1 min-w-0 p-4 lg:p-8 space-y-4 animate-pulse pb-20 lg:pb-0">
          <div className="h-8 w-48 bg-[var(--border-warm)] rounded-lg" />
          <div className="h-36 bg-[var(--border-warm)] rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[var(--border-warm)] rounded-xl" />)}
          </div>
          <div className="h-72 bg-[var(--border-warm)] rounded-xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="lg:hidden"><Logo size={24} href="/dashboard" /></div>
          <div className="hidden lg:block">
            <h1 className="text-xl lg:text-2xl font-display text-[var(--maroon-deep)]">
              Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, {user?.name ?? "Staff"}
            </h1>
            <p className="text-xs text-[var(--muted-warm)] mt-0.5">
              {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm font-mono text-[var(--brown)]">{now.toLocaleTimeString("en-IN")}</span>
            {refreshing && <Loader2 size={16} className="text-[var(--amber-brand)] animate-spin" />}

            {/* Bell dropdown */}
            <div className="relative">
              <button onClick={() => setShowBell(!showBell)}
                className="relative p-1.5 rounded-lg hover:bg-[var(--hover-warm)] transition-colors">
                <Bell size={20} className="text-[var(--brown)]" />
                {bellCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--amber-brand)] text-white text-[10px] grid place-items-center font-bold">
                    {bellCount}
                  </span>
                )}
              </button>
              {showBell && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-2xl border border-[var(--border-warm)] z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-warm)]">
                    <h3 className="font-bold text-sm text-[var(--maroon-deep)]">Notifications</h3>
                    <button onClick={() => setShowBell(false)} className="text-[var(--muted-warm)] hover:text-[var(--brown)]"><X size={16} /></button>
                  </div>
                  <div className="max-h-72 overflow-y-auto scrollbar-thin">
                    {data.pendingTokenCount > 0 && (
                      <Link href="/counter" onClick={() => setShowBell(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-warm)] transition-colors border-b border-[var(--border-warm)]">
                        <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 grid place-items-center text-base shrink-0">⏳</span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">{data.pendingTokenCount} token{data.pendingTokenCount !== 1 ? "s" : ""} waiting</p>
                          <p className="text-xs text-[var(--muted-warm)]">Tap to open counter queue</p>
                        </div>
                      </Link>
                    )}
                    {data.liveQueue.slice(0, 6).map((q) => (
                      <div key={q.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-warm)] last:border-0">
                        <span className="font-mono text-xs font-bold text-[var(--maroon-deep)] w-9 shrink-0">#{String(q.tokenNumber).padStart(3, "0")}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--ink)] truncate">{q.items}</p>
                          <p className="text-[10px] text-[var(--muted-warm)] capitalize">{q.status.replace("_", " ")}</p>
                        </div>
                        <span className="text-xs font-bold text-[var(--amber-brand)] shrink-0">₹{q.total}</span>
                      </div>
                    ))}
                    {data.pendingTokenCount === 0 && data.liveQueue.length === 0 && (
                      <div className="py-10 text-center text-sm text-[var(--muted-warm)]">All caught up! No pending tokens.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link href="/staff"
              className="w-9 h-9 rounded-full bg-[var(--maroon)] text-[var(--gold-pale)] grid place-items-center font-bold text-sm hover:opacity-80 transition-opacity"
              title={user?.name ?? "Staff"}>
              {user?.name?.[0]?.toUpperCase() ?? "S"}
            </Link>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-5">

          {/* Alert bar */}
          {data.pendingTokenCount > 0 && (
            <div className="flex items-center gap-2 bg-[var(--gold-pale)]/50 border border-[var(--amber-brand)]/30 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-[var(--pending-brand)] shrink-0" />
              <p className="text-sm text-[var(--ink)] flex-1">{data.pendingTokenCount} token{data.pendingTokenCount !== 1 ? "s" : ""} pending at snacks counter</p>
              <Link href="/counter" className="text-xs text-[var(--brown)] font-semibold hover:text-[var(--maroon-deep)] underline">View →</Link>
            </div>
          )}

          {/* Hero revenue card */}
          <div className="rounded-2xl p-6 text-[var(--gold-pale)] heritage-texture relative overflow-hidden" style={{ background: "var(--maroon-deep)" }}>
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-wider text-[var(--gold-pale)]/60 mb-1">{period}&apos;s Revenue</p>
              <p className="text-5xl font-bold font-display" style={{ color: "#F5D79E" }}>₹{data.totalRevenue.toLocaleString("en-IN")}</p>
              <div className="flex gap-3 mt-3 flex-wrap">
                <span className="px-3 py-1 rounded-full text-sm bg-white/10">☕ Tea ₹{data.teaRevenue.toLocaleString("en-IN")}</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: "rgba(232,146,10,0.25)", color: "#F5D79E" }}>🍟 Snacks ₹{data.snacksRevenue.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                {data.revenueVsYesterday ? (
                  <span className={`text-sm font-semibold flex items-center gap-1 ${data.revenueVsYesterday.positive ? "text-green-400" : "text-red-400"}`}>
                    {data.revenueVsYesterday.positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    ₹{data.revenueVsYesterday.amount.toLocaleString("en-IN")} {data.revenueVsYesterday.positive ? "more" : "less"} than yesterday
                  </span>
                ) : <span />}
                <span className="text-[var(--gold-pale)]/70 text-sm">{data.orderCount} orders</span>
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard accent={MAROON} icon={<IndianRupee className="text-[var(--amber-brand)]" size={18} />}
              label={`${period}'s Revenue`} value={`₹${data.totalRevenue.toLocaleString("en-IN")}`}
              sub={
                data.revenueVsYesterday
                  ? <span className={`flex items-center gap-1 text-xs font-semibold ${data.revenueVsYesterday.positive ? "text-[var(--success-brand)]" : "text-red-500"}`}>
                      {data.revenueVsYesterday.positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      ₹{data.revenueVsYesterday.amount.toLocaleString("en-IN")} vs yesterday
                    </span>
                  : <span className="text-xs text-[var(--muted-warm)]">{period} total</span>
              } />
            <KpiCard accent={AMBER} icon={<ShoppingBag className="text-[var(--brown)]" size={18} />}
              label={`${period}'s Orders`} value={`${data.orderCount} orders`}
              sub={<span className="text-xs text-[var(--muted-warm)]">Avg ₹{data.avgOrder} per order</span>} />
            <KpiCard accent={MAROON} icon={<Clock className="text-[var(--amber-brand)]" size={18} />}
              label="Peak Hour" value={data.peakHour}
              sub={<span className="text-xs text-[var(--muted-warm)]">{data.peakHourCount} orders in this slot</span>} />
            <KpiCard accent="#C0392B" icon={<Ticket className="text-[var(--brown)]" size={18} />}
              label="Pending Tokens"
              value={<span className="flex items-center gap-2">{data.pendingTokenCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}{data.pendingTokenCount} tokens</span>}
              sub={<span className="text-xs text-[var(--muted-warm)]">Snacks counter</span>} />
          </div>

          {/* Revenue chart + pie */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 card-warm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[var(--maroon-deep)]">Revenue Overview</h3>
                <div className="flex gap-1 bg-[var(--gold-bg)] rounded-lg p-1">
                  {(["Today", "Week", "Month"] as Period[]).map((p) => (
                    <button key={p} onClick={() => handlePeriod(p)}
                      className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors ${period === p ? "bg-[var(--amber-brand)] text-white" : "text-[var(--muted-warm)]"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="h-60">
                <ResponsiveContainer>
                  {chartDataKey ? (
                    <AreaChart data={data.hourlyData}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={MAROON} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={MAROON} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-warm)" />
                      <XAxis dataKey="hour" stroke="var(--muted-warm)" fontSize={11} interval={2} />
                      <YAxis stroke="var(--muted-warm)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "white", border: `1px solid ${MAROON}`, borderRadius: 8 }} formatter={(v) => [v ?? 0, "Orders"]} />
                      <Area type="monotone" dataKey="orders" stroke={MAROON} fill="url(#g1)" strokeWidth={2} name="Orders" />
                    </AreaChart>
                  ) : (
                    <AreaChart data={data.chartData}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={MAROON} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={MAROON} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={AMBER} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-warm)" />
                      <XAxis dataKey={xKey} stroke="var(--muted-warm)" fontSize={12} />
                      <YAxis stroke="var(--muted-warm)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "white", border: `1px solid ${MAROON}`, borderRadius: 8 }} formatter={(v: unknown) => `₹${v}`} />
                      <Area type="monotone" dataKey="tea" stroke={MAROON} fill="url(#g1)" strokeWidth={2} name="Tea" />
                      <Area type="monotone" dataKey="snacks" stroke={AMBER} fill="url(#g2)" strokeWidth={2} name="Snacks" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 card-warm p-5">
              <h3 className="text-base font-bold text-[var(--maroon-deep)] mb-2">Tea vs Snacks</h3>
              <div className="relative h-52">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>
                      {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-bold font-display text-[var(--maroon-deep)]">₹{data.totalRevenue.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-[var(--muted-warm)]">{period}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                {data.totalRevenue > 0 && (
                  <>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: MAROON }} /><span className="text-[var(--maroon)] font-semibold">Tea {Math.round((data.teaRevenue / data.totalRevenue) * 100)}%</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: AMBER }} /><span className="text-[var(--maroon)] font-semibold">Snacks {Math.round((data.snacksRevenue / data.totalRevenue) * 100)}%</span></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Secondary charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-warm p-5">
              <h3 className="font-bold text-[var(--maroon-deep)] mb-4 text-sm">Peak Hours Today</h3>
              <div className="h-44">
                <ResponsiveContainer>
                  <BarChart data={data.hourlyData}>
                    <XAxis dataKey="hour" stroke="var(--muted-warm)" fontSize={10} interval={2} />
                    <YAxis stroke="var(--muted-warm)" fontSize={10} />
                    <Tooltip contentStyle={{ background: "white", borderRadius: 8, border: `1px solid ${AMBER}` }} />
                    <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                      {data.hourlyData.map((d, i) => <Cell key={i} fill={d.orders === maxOrders && maxOrders > 0 ? MAROON : AMBER} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-warm p-5">
              <h3 className="font-bold text-[var(--maroon-deep)] mb-4 text-sm">Top Items {period}</h3>
              {data.topItems.length === 0 ? (
                <p className="text-sm text-[var(--muted-warm)] text-center py-6">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {data.topItems.slice(0, 5).map((it, i) => (
                    <div key={it.id} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-[var(--muted-warm)]">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-[var(--maroon-deep)] truncate">{it.name}</span>
                          <span className="text-[var(--muted-warm)]">₹{it.revenue}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--border-warm)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${data.topItems[0]?.revenue ? (it.revenue / data.topItems[0].revenue) * 100 : 0}%`,
                            background: `linear-gradient(90deg, ${MAROON}, ${AMBER})`,
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-warm p-5">
              <h3 className="font-bold text-[var(--maroon-deep)] mb-2 text-sm">Payment Methods</h3>
              {paymentData.length === 0 ? (
                <p className="text-sm text-[var(--muted-warm)] text-center py-6">No data</p>
              ) : (
                <>
                  <div className="h-36">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={paymentData} dataKey="value" innerRadius={38} outerRadius={60}>
                          {paymentData.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-xs space-y-1 mt-1">
                    {paymentData.map((d) => (
                      <p key={d.name} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                        <span className="font-semibold text-[var(--maroon-deep)] capitalize">{d.name} ₹{d.value.toLocaleString("en-IN")}</span>
                      </p>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Live token queue */}
          <div className="bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[var(--maroon-deep)] flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--success-brand)] animate-pulse" />
                Token Queue (Live)
              </h3>
              <Link href="/counter" className="text-xs text-[var(--amber-brand)] font-semibold hover:underline">View All →</Link>
            </div>
            {data.liveQueue.length === 0 ? (
              <p className="text-sm text-[var(--muted-warm)]">No active tokens right now</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {data.liveQueue.map((t) => (
                  <span key={t.id}
                    className={`shrink-0 px-4 py-2 rounded-lg font-bold text-sm ${TOKEN_STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                    <span className="font-mono">#{String(t.tokenNumber).padStart(3, "0")}</span>
                    <span className="ml-1.5 text-xs capitalize">{t.status.replace("_", " ")}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-xl p-4 border-l-4" style={{ borderLeftColor: MAROON }}>
              <div className="flex items-center gap-2 mb-1">
                <Coffee size={18} className="text-[var(--maroon)]" />
                <h3 className="font-bold text-[var(--maroon-deep)]">Tea Counter</h3>
              </div>
              <p className="text-sm text-[var(--muted-warm)]">
                {period}: ₹{data.teaRevenue.toLocaleString("en-IN")} · {data.teaCupCount} cups
              </p>
              <p className="text-xs text-[var(--muted-warm)] mt-0.5">
                Morning: {data.teaStatsToday.morning.cups} cups · Evening: {data.teaStatsToday.evening.cups} cups
              </p>
              <Link href="/tea-entry" className="mt-3 inline-block text-xs text-[var(--amber-brand)] font-semibold hover:underline">
                View Tea Dashboard →
              </Link>
            </div>
            <div className="bg-[var(--gold-bg)] border border-[var(--border-warm)] rounded-xl p-4 border-l-4" style={{ borderLeftColor: AMBER }}>
              <div className="flex items-center gap-2 mb-1">
                <UtensilsCrossed size={18} className="text-[var(--amber-brand)]" />
                <h3 className="font-bold text-[var(--maroon-deep)]">Snacks Counter</h3>
              </div>
              <p className="text-sm text-[var(--muted-warm)]">
                {period}: ₹{data.snacksRevenue.toLocaleString("en-IN")} · {data.orderCount} orders
              </p>
              <p className="text-xs text-[var(--muted-warm)] mt-0.5">Avg ₹{data.avgOrder} per order</p>
              <Link href="/counter" className="mt-3 inline-block text-xs text-[var(--amber-brand)] font-semibold hover:underline">
                View Snacks Dashboard →
              </Link>
            </div>
          </div>

          {/* Insights */}
          <div className="card-warm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="text-[var(--amber-brand)]" size={18} />
              <h3 className="font-bold text-[var(--maroon-deep)] text-sm">{period}&apos;s Insights</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.insights.map((ins, i) => (
                <div key={i} className="bg-[var(--gold-bg)] rounded-lg p-4 border-l-4"
                  style={{ borderLeftColor: [MAROON, AMBER, SUCCESS][i] }}>
                  <p className="text-sm text-[var(--ink)]">{ins}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Daily report */}
          <div className="bg-[var(--gold-bg)] border-2 border-dashed border-[var(--border-warm)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[var(--maroon-deep)] text-sm">{period} Summary</h3>
              <button onClick={shareReport}
                className="flex items-center gap-1.5 text-[var(--amber-brand)] hover:text-[var(--brown)] text-sm font-semibold transition-colors">
                <Share2 size={15} /> Share Report
              </button>
            </div>
            <div className="text-sm text-[var(--muted-warm)] space-y-1">
              <p>📅 {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
              <p>💰 Total Revenue: <span className="font-bold text-[var(--maroon-deep)]">₹{data.totalRevenue.toLocaleString("en-IN")}</span></p>
              <p>📦 Total Orders: <span className="font-bold text-[var(--maroon-deep)]">{data.orderCount}</span> · Avg ₹{data.avgOrder}</p>
              <p>🏆 Top Item: <span className="font-bold text-[var(--maroon-deep)]">{data.topItems[0]?.name ?? "—"} ({data.topItems[0]?.qty ?? 0} units)</span></p>
              <p>⏰ Peak Hour: <span className="font-bold text-[var(--maroon-deep)]">{data.peakHour}</span></p>
            </div>
          </div>

          {/* Recent orders table */}
          <div className="bg-[var(--gold-bg)] rounded-xl border border-[var(--border-warm)] overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-warm)]">
              <h3 className="font-bold text-[var(--maroon-deep)] flex items-center gap-2 text-sm">
                <TrendingUp size={16} /> Recent Orders
              </h3>
              <Link href="/orders" className="text-xs text-[var(--amber-brand)] font-semibold hover:underline">View All →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--gold-pale)]/40 text-[var(--muted-warm)] text-xs uppercase">
                  <tr>
                    {["Token", "Source", "Items", "Amount", "Payment", "Status", "Time"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-[var(--muted-warm)]">No orders yet</td></tr>
                  ) : (
                    data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-t border-[var(--border-warm)] hover:bg-[var(--hover-warm)] transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[var(--maroon-deep)]">{o.tokenNumber}</td>
                        <td className="px-4 py-3 text-[var(--ink)] capitalize">{o.source}</td>
                        <td className="px-4 py-3 text-[var(--muted-warm)] max-w-[180px] truncate">{o.items}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--ink)]">₹{o.amount}</td>
                        <td className="px-4 py-3 text-[var(--ink)] capitalize">{o.paymentMethod}</td>
                        <td className="px-4 py-3"><StatusPill status={o.tokenStatus ?? o.status} /></td>
                        <td className="px-4 py-3 text-[var(--muted-warm)]">{o.time}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function KpiCard({ accent, icon, label, value, sub }: {
  accent: string; icon: React.ReactNode; label: string; value: React.ReactNode; sub: React.ReactNode;
}) {
  return (
    <div className="relative card-warm p-5 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-warm)]">{label}</p>
        <div className="w-9 h-9 rounded-full bg-[var(--gold-pale)]/60 grid place-items-center">{icon}</div>
      </div>
      <div className="text-xl font-bold text-[var(--maroon-deep)] font-display">{value}</div>
      <div className="mt-2">{sub}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:          "bg-[var(--gold-pale)] text-[var(--pending-brand)]",
    awaiting_payment: "bg-orange-50 text-orange-700",
    preparing:        "bg-red-50 text-red-700",
    ready:            "bg-[var(--amber-brand)]/20 text-[var(--amber-brand)]",
    served:           "bg-[var(--success-brand)]/10 text-[var(--success-brand)]",
    confirmed:        "bg-blue-50 text-blue-700",
    cancelled:        "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
