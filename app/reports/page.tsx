'use client';

import { useEffect, useState, useCallback } from "react";
import { Share2, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

const MAROON = "#4A1414";
const AMBER  = "#E8920A";

type Period = "Today" | "Week" | "Month";

type AnalyticsData = {
  totalRevenue: number;
  orderCount: number;
  avgOrder: number;
  topItems: { id: string; name: string; qty: number; revenue: number }[];
  hourlyData: { hour: string; orders: number }[];
  chartData: Record<string, unknown>[];
  paymentSplit: Record<string, number>;
  insights: string[];
};

const EMPTY: AnalyticsData = {
  totalRevenue: 0, orderCount: 0, avgOrder: 0,
  topItems: [], hourlyData: [], chartData: [], paymentSplit: {},
  insights: [],
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("Week");
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: Period) => {
    setLoading(true);
    fetch(`/api/analytics?period=${p}`)
      .then(r => r.json())
      .then(d => setData(d as AnalyticsData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const xKey = period === "Month" ? "week" : period === "Week" ? "day" : "hour";

  const bestDay = (() => {
    if (!data.chartData.length) return "—";
    const best = [...data.chartData].sort((a, b) => ((b as { orders: number }).orders ?? 0) - ((a as { orders: number }).orders ?? 0))[0];
    return (best as Record<string, unknown>)[xKey] as string ?? "—";
  })();

  const paymentData = Object.entries(data.paymentSplit).map(([name, value], i) => ({
    name, value, color: i % 2 === 0 ? MAROON : AMBER,
  }));

  const shareReport = () => {
    const text = `*Nyahari ${period} Report*\n\n💰 Revenue: ₹${data.totalRevenue.toLocaleString("en-IN")}\n📦 Orders: ${data.orderCount}\n📊 Avg Order: ₹${data.avgOrder}\n🏆 Top Item: ${data.topItems[0]?.name ?? "—"}\n\n_via Nyahari App_`;
    if (navigator.share) navigator.share({ text });
    else navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex min-h-screen bg-[var(--gold-bg)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">

        <header className="sticky top-0 z-10 bg-[var(--gold-bg)] border-b border-[var(--border-warm)] px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-xl font-bold text-[var(--maroon-deep)]">Reports</h1>
            <p className="text-xs text-[var(--muted-warm)]">Performance overview</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white border border-[var(--border-warm)] rounded-lg p-1">
              {(["Today", "Week", "Month"] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors ${period === p ? "bg-[var(--amber-brand)] text-white" : "text-[var(--muted-warm)]"}`}>{p}</button>
              ))}
            </div>
            <button onClick={shareReport} className="btn-amber h-9 px-4 text-sm flex items-center gap-1.5 rounded-lg">
              <Share2 size={13} /> Share
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-5">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="text-[var(--amber-brand)] animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Revenue", val: `₹${data.totalRevenue.toLocaleString("en-IN")}` },
                  { label: "Total Orders",  val: data.orderCount },
                  { label: "Avg Order",     val: `₹${data.avgOrder}` },
                  { label: period === "Today" ? "Peak Hour" : "Best Day", val: bestDay },
                ].map((k) => (
                  <div key={k.label} className="card-warm p-4">
                    <p className="text-xs text-[var(--muted-warm)] uppercase tracking-wide">{k.label}</p>
                    <p className="text-xl font-bold text-[var(--maroon-deep)] mt-1">{k.val}</p>
                  </div>
                ))}
              </div>

              {/* Revenue trend */}
              <div className="card-warm p-5">
                <h3 className="font-bold text-[var(--maroon-deep)] mb-4 text-sm">
                  {period === "Today" ? "Hourly Orders Today" : `Revenue Trend (${period})`}
                </h3>
                <div className="h-56">
                  <ResponsiveContainer>
                    {period === "Today" ? (
                      <AreaChart data={data.hourlyData}>
                        <defs>
                          <linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={MAROON} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={MAROON} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-warm)" />
                        <XAxis dataKey="hour" stroke="var(--muted-warm)" fontSize={11} interval={2} />
                        <YAxis stroke="var(--muted-warm)" fontSize={11} />
                        <Tooltip formatter={(v) => [v ?? 0, "Orders"]} contentStyle={{ border: `1px solid ${MAROON}`, borderRadius: 8 }} />
                        <Area type="monotone" dataKey="orders" stroke={MAROON} fill="url(#rg1)" strokeWidth={2} name="Orders" />
                      </AreaChart>
                    ) : (
                      <AreaChart data={data.chartData}>
                        <defs>
                          <linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={MAROON} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={MAROON} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={AMBER} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-warm)" />
                        <XAxis dataKey={xKey} stroke="var(--muted-warm)" fontSize={11} />
                        <YAxis stroke="var(--muted-warm)" fontSize={11} />
                        <Tooltip formatter={(v: unknown) => `₹${v}`} contentStyle={{ border: `1px solid ${MAROON}`, borderRadius: 8 }} />
                        <Area type="monotone" dataKey="tea"    stroke={MAROON} fill="url(#rg1)" strokeWidth={2} name="Tea" />
                        <Area type="monotone" dataKey="snacks" stroke={AMBER}  fill="url(#rg2)" strokeWidth={2} name="Snacks" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Orders per period */}
                <div className="card-warm p-5">
                  <h3 className="font-bold text-[var(--maroon-deep)] mb-4 text-sm">
                    {period === "Today" ? "Hourly Orders" : period === "Week" ? "Orders per Day" : "Orders per Week"}
                  </h3>
                  <div className="h-44">
                    <ResponsiveContainer>
                      <BarChart data={period === "Today" ? data.hourlyData : data.chartData}>
                        <XAxis dataKey={xKey} stroke="var(--muted-warm)" fontSize={10} interval={period === "Today" ? 2 : 0} />
                        <YAxis stroke="var(--muted-warm)" fontSize={10} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Bar dataKey="orders" fill={MAROON} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top items */}
                <div className="card-warm p-5">
                  <h3 className="font-bold text-[var(--maroon-deep)] mb-4 text-sm">Top Items</h3>
                  {data.topItems.length === 0 ? (
                    <p className="text-sm text-[var(--muted-warm)] text-center py-6">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {data.topItems.slice(0, 5).map((it, i) => (
                        <div key={it.id} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--muted-warm)] w-4">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-semibold text-[var(--ink)] truncate">{it.name}</span>
                              <span className="text-[var(--muted-warm)] shrink-0 ml-2">{it.qty} sold</span>
                            </div>
                            <div className="h-1.5 bg-[var(--border-warm)] rounded-full">
                              <div className="h-full rounded-full" style={{
                                width: `${data.topItems[0]?.qty ? (it.qty / data.topItems[0].qty) * 100 : 0}%`,
                                background: `linear-gradient(90deg, ${MAROON}, ${AMBER})`,
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment split */}
                <div className="card-warm p-5">
                  <h3 className="font-bold text-[var(--maroon-deep)] mb-2 text-sm">Payment Split</h3>
                  {paymentData.length === 0 ? (
                    <p className="text-sm text-[var(--muted-warm)] text-center py-6">No data</p>
                  ) : (
                    <>
                      <div className="h-36">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={paymentData} dataKey="value" innerRadius={38} outerRadius={58}>
                              {paymentData.map((d) => <Cell key={d.name} fill={d.color} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-xs space-y-1 mt-1">
                        {paymentData.map((d) => (
                          <p key={d.name} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                            <span className="font-semibold text-[var(--ink)] capitalize">{d.name} ₹{d.value.toLocaleString("en-IN")}</span>
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Hourly traffic */}
              {period !== "Today" && (
                <div className="card-warm p-5">
                  <h3 className="font-bold text-[var(--maroon-deep)] mb-4 text-sm">Hourly Traffic (Today)</h3>
                  <div className="h-44">
                    <ResponsiveContainer>
                      <BarChart data={data.hourlyData}>
                        <XAxis dataKey="hour" stroke="var(--muted-warm)" fontSize={10} interval={2} />
                        <YAxis stroke="var(--muted-warm)" fontSize={10} />
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Bar dataKey="orders" radius={[3, 3, 0, 0]} fill={AMBER} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Insights */}
              {data.insights.length > 0 && (
                <div className="card-warm p-5">
                  <h3 className="font-bold text-[var(--maroon-deep)] mb-3 text-sm">Key Insights</h3>
                  <div className="space-y-2">
                    {data.insights.map((ins, i) => (
                      <div key={i} className="bg-[var(--gold-bg)] rounded-lg px-4 py-3 text-sm text-[var(--ink)] border-l-4"
                        style={{ borderLeftColor: [MAROON, AMBER, "#1A6B3A"][i] }}>
                        {ins}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
