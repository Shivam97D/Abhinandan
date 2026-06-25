import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function fmt(n: number) {
  return Math.round(n);
}

export async function GET(req: NextRequest) {
  try {
    const period = (req.nextUrl.searchParams.get("period") || "Today").toLowerCase() as
      | "today"
      | "week"
      | "month";

    const now = new Date();
    let periodStart: Date;

    if (period === "today") {
      periodStart = startOfDay(now);
    } else if (period === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      periodStart = startOfDay(d);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    // ── Main orders query ────────────────────────────────────────
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: periodStart }, status: { not: "cancelled" } },
      include: { items: { include: { menuItem: true } }, token: true },
      orderBy: { createdAt: "desc" },
    });

    // ── Aggregations ─────────────────────────────────────────────
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const orderCount = orders.length;
    const avgOrder = orderCount > 0 ? fmt(totalRevenue / orderCount) : 0;

    let teaRevenue = 0;
    let snacksRevenue = 0;
    const itemMap: Record<string, { id: string; name: string; section: string; qty: number; revenue: number }> = {};
    const paymentSplitRaw: Record<string, number> = {};

    for (const o of orders) {
      for (const it of o.items) {
        const sec = it.menuItem?.section;
        const rev = it.price * it.qty;
        if (sec === "tea") teaRevenue += rev;
        else snacksRevenue += rev;

        const key = it.menuItemId;
        if (!itemMap[key]) itemMap[key] = { id: key, name: it.menuItem?.name ?? "Item", section: it.menuItem?.section ?? "snacks", qty: 0, revenue: 0 };
        itemMap[key].qty += it.qty;
        itemMap[key].revenue += rev;
      }
      const pm = o.paymentMethod || "unknown";
      paymentSplitRaw[pm] = (paymentSplitRaw[pm] || 0) + o.total;
    }

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((i) => ({ ...i, revenue: fmt(i.revenue) }));

    // ── Hourly data (always computed, used when period=today) ─────
    const hourSlots: Record<number, number> = {};
    for (let h = 7; h <= 22; h++) hourSlots[h] = 0;
    for (const o of orders) {
      const h = new Date(o.createdAt).getHours();
      if (h >= 7 && h <= 22) hourSlots[h] = (hourSlots[h] || 0) + 1;
    }
    const HOUR_LABELS = ["12AM","1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM"];
    const hourlyData = Object.entries(hourSlots).map(([h, cnt]) => ({
      hour: HOUR_LABELS[Number(h)] ?? `${h}`,
      orders: cnt,
    }));

    let peakHour = "—";
    let peakHourCount = 0;
    if (hourlyData.length) {
      const peak = hourlyData.reduce((a, b) => (b.orders > a.orders ? b : a));
      peakHour = peak.hour;
      peakHourCount = peak.orders;
    }

    // ── Chart data ────────────────────────────────────────────────
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let chartData: object[] = [];
    if (period === "week") {
      const dayMap: Record<string, { day: string; tea: number; snacks: number; orders: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dayMap[key] = { day: DAY_NAMES[d.getDay()], tea: 0, snacks: 0, orders: 0 };
      }
      for (const o of orders) {
        const key = new Date(o.createdAt).toISOString().split("T")[0];
        if (!dayMap[key]) continue;
        dayMap[key].orders += 1;
        for (const it of o.items) {
          const rev = it.price * it.qty;
          if (it.menuItem?.section === "tea") dayMap[key].tea += rev;
          else dayMap[key].snacks += rev;
        }
      }
      chartData = Object.values(dayMap);
    } else if (period === "month") {
      const weeks: { week: string; tea: number; snacks: number; orders: number }[] = [
        { week: "W1", tea: 0, snacks: 0, orders: 0 },
        { week: "W2", tea: 0, snacks: 0, orders: 0 },
        { week: "W3", tea: 0, snacks: 0, orders: 0 },
        { week: "W4", tea: 0, snacks: 0, orders: 0 },
      ];
      for (const o of orders) {
        const day = new Date(o.createdAt).getDate();
        const wi = Math.min(Math.floor((day - 1) / 7), 3);
        weeks[wi].orders += 1;
        for (const it of o.items) {
          const rev = it.price * it.qty;
          if (it.menuItem?.section === "tea") weeks[wi].tea += rev;
          else weeks[wi].snacks += rev;
        }
      }
      chartData = weeks;
    } else {
      chartData = hourlyData;
    }

    // ── Pending tokens ────────────────────────────────────────────
    const todayStr = now.toISOString().split("T")[0];
    const pendingTokenCount = await prisma.token.count({
      where: { date: todayStr, status: { in: ["awaiting_payment", "pending", "preparing", "ready"] } },
    });

    // ── Live queue ────────────────────────────────────────────────
    const liveTokens = await prisma.token.findMany({
      where: { date: todayStr, status: { not: "served" } },
      orderBy: { tokenNumber: "asc" },
      take: 8,
      include: { order: { include: { items: { include: { menuItem: true } } } } },
    });
    const liveQueue = liveTokens.map((t) => ({
      id: t.id,
      tokenNumber: t.tokenNumber,
      status: t.status,
      paymentMethod: t.order.paymentMethod,
      total: t.order.total,
      items: t.order.items.map((i) => `${i.menuItem?.name ?? "Item"} ×${i.qty}`).join(" · "),
    }));

    // ── Recent orders ─────────────────────────────────────────────
    const recentOrders = orders.slice(0, 15).map((o) => ({
      id: o.id,
      tokenNumber: o.tokenNumber ? `#${String(o.tokenNumber).padStart(3, "0")}` : "—",
      source: o.source,
      items: o.items.map((i) => `${i.menuItem?.name ?? "Item"} ×${i.qty}`).join(", "),
      amount: fmt(o.total),
      paymentMethod: o.paymentMethod || "pending",
      status: o.token?.status ?? o.status,
      tokenStatus: o.token?.status ?? null,
      time: new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    }));

    // ── Insights ──────────────────────────────────────────────────
    const cashTotal = fmt((paymentSplitRaw["cash"] || 0) + (paymentSplitRaw["counter_cash"] || 0));
    const upiTotal = fmt((paymentSplitRaw["upi"] || 0) + (paymentSplitRaw["counter_upi"] || 0));
    const insights = [
      topItems[0]
        ? `#1 item: ${topItems[0].name} — ${topItems[0].qty} sold, ₹${topItems[0].revenue} revenue`
        : "No orders yet this period",
      `Cash vs UPI: ₹${cashTotal.toLocaleString("en-IN")} cash / ₹${upiTotal.toLocaleString("en-IN")} UPI`,
      `Avg order value: ₹${avgOrder}. ${orderCount} order${orderCount !== 1 ? "s" : ""} this ${period}`,
    ];

    // ── Tea stats ─────────────────────────────────────────────────
    const todayStart = startOfDay(now);
    const teaEntries = await prisma.teaQuickEntry.findMany({
      where: { createdAt: { gte: todayStart } },
    });
    const teaCupCount = teaEntries.reduce((s, e) => s + e.cups, 0);
    const teaStatsToday = {
      morning: { cups: 0, amount: 0 },
      evening: { cups: 0, amount: 0 },
    };
    for (const e of teaEntries) {
      const key = e.shift as "morning" | "evening";
      if (teaStatsToday[key]) {
        teaStatsToday[key].cups += e.cups;
        teaStatsToday[key].amount += e.amount ?? 0;
      }
    }

    // ── Yesterday comparison (today mode only) ────────────────────
    let yesterdayRevenue: number | null = null;
    let revenueVsYesterday: { amount: number; positive: boolean } | null = null;
    if (period === "today") {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(todayStart);
      const yesterdayOrders = await prisma.order.findMany({
        where: { createdAt: { gte: yStart, lt: yEnd }, status: { not: "cancelled" } },
        select: { total: true },
      });
      yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.total, 0);
      const diff = totalRevenue - yesterdayRevenue;
      revenueVsYesterday = { amount: fmt(Math.abs(diff)), positive: diff >= 0 };
    }

    const paymentSplit: Record<string, number> = {};
    for (const [k, v] of Object.entries(paymentSplitRaw)) {
      paymentSplit[k] = fmt(v);
    }

    return NextResponse.json({
      totalRevenue: fmt(totalRevenue),
      orderCount,
      avgOrder,
      teaRevenue: fmt(teaRevenue),
      snacksRevenue: fmt(snacksRevenue),
      paymentSplit,
      topItems,
      hourlyData,
      chartData,
      peakHour,
      peakHourCount,
      pendingTokenCount,
      liveQueue,
      recentOrders,
      insights,
      teaCupCount,
      teaStatsToday,
      yesterdayRevenue: yesterdayRevenue !== null ? fmt(yesterdayRevenue) : null,
      revenueVsYesterday,
      period,
    }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (e) {
    console.error("[GET /api/analytics]", e);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
