import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { businessDate, businessDayStart, addDays, istHour, weekdayName } from "@/lib/businessDay";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return Math.round(n);
}

export async function GET(req: NextRequest) {
  try {
    const period = (req.nextUrl.searchParams.get("period") || "Today").toLowerCase() as
      | "today"
      | "week"
      | "month";

    const reset = (
      await prisma.shopSettings.findUnique({
        where: { id: "default" },
        select: { tokenResetTime: true },
      })
    )?.tokenResetTime ?? "07:00";

    // ── Business-day boundaries (IST) ─────────────────────────────────────────
    const todayStr = businessDate(reset);
    let periodStart: Date;
    if (period === "today") {
      periodStart = businessDayStart(todayStr, reset);
    } else if (period === "week") {
      periodStart = businessDayStart(addDays(todayStr, -6), reset);
    } else {
      const [y, m] = todayStr.split("-");
      periodStart = businessDayStart(`${y}-${m}-01`, reset);
    }

    // ── Main orders query ─────────────────────────────────────────────────────
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: periodStart }, status: { not: "cancelled" } },
      include: { items: { include: { menuItem: true } }, token: true },
      orderBy: { createdAt: "desc" },
    });

    // ── Aggregations ──────────────────────────────────────────────────────────
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const orderCount = orders.length;
    const avgOrder = orderCount > 0 ? fmt(totalRevenue / orderCount) : 0;

    let snacksRevenue = 0;
    const itemMap: Record<string, { id: string; name: string; qty: number; revenue: number }> = {};
    const paymentSplitRaw: Record<string, number> = {};

    for (const o of orders) {
      for (const it of o.items) {
        const rev = it.price * it.qty;
        snacksRevenue += rev;
        const key = it.menuItemId;
        if (!itemMap[key]) itemMap[key] = { id: key, name: it.menuItem?.name ?? "Item", qty: 0, revenue: 0 };
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

    // ── Hourly data (IST hours, shop window 7am–10pm) ─────────────────────────
    const hourSlots: Record<number, number> = {};
    for (let h = 7; h <= 22; h++) hourSlots[h] = 0;
    for (const o of orders) {
      const h = istHour(new Date(o.createdAt));
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

    // ── Chart data ────────────────────────────────────────────────────────────
    let chartData: object[] = [];
    if (period === "week") {
      const dayMap: Record<string, { day: string; revenue: number; orders: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const ds = addDays(todayStr, -i);
        dayMap[ds] = { day: weekdayName(ds), revenue: 0, orders: 0 };
      }
      for (const o of orders) {
        const ds = businessDate(reset, new Date(o.createdAt));
        if (!dayMap[ds]) continue;
        dayMap[ds].orders += 1;
        dayMap[ds].revenue += o.total;
      }
      chartData = Object.values(dayMap).map((d) => ({ ...d, revenue: fmt(d.revenue) }));
    } else if (period === "month") {
      const weeks: { week: string; revenue: number; orders: number }[] = [
        { week: "W1", revenue: 0, orders: 0 },
        { week: "W2", revenue: 0, orders: 0 },
        { week: "W3", revenue: 0, orders: 0 },
        { week: "W4", revenue: 0, orders: 0 },
      ];
      for (const o of orders) {
        const day = parseInt(businessDate(reset, new Date(o.createdAt)).split("-")[2], 10);
        const wi = Math.min(Math.floor((day - 1) / 7), 3);
        weeks[wi].orders += 1;
        weeks[wi].revenue += o.total;
      }
      chartData = weeks.map((w) => ({ ...w, revenue: fmt(w.revenue) }));
    } else {
      chartData = hourlyData;
    }

    // ── Pending tokens + live queue (current business day) ────────────────────
    const pendingTokenCount = await prisma.token.count({
      where: { date: todayStr, status: { in: ["awaiting_payment", "pending", "preparing", "ready"] } },
    });

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

    // ── Recent orders ─────────────────────────────────────────────────────────
    const recentOrders = orders.slice(0, 15).map((o) => ({
      id: o.id,
      tokenNumber: o.tokenNumber ? `#${String(o.tokenNumber).padStart(3, "0")}` : "—",
      source: o.source,
      items: o.items.map((i) => `${i.menuItem?.name ?? "Item"} ×${i.qty}`).join(", "),
      amount: fmt(o.total),
      paymentMethod: o.paymentMethod || "pending",
      status: o.token?.status ?? o.status,
      tokenStatus: o.token?.status ?? null,
      time: new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }),
    }));

    // ── Insights ──────────────────────────────────────────────────────────────
    const cashTotal = fmt((paymentSplitRaw["cash"] || 0) + (paymentSplitRaw["counter_cash"] || 0));
    const upiTotal = fmt((paymentSplitRaw["upi"] || 0) + (paymentSplitRaw["counter_upi"] || 0));
    const insights = [
      topItems[0]
        ? `#1 item: ${topItems[0].name} — ${topItems[0].qty} sold, ₹${topItems[0].revenue} revenue`
        : "No orders yet this period",
      `Cash vs UPI: ₹${cashTotal.toLocaleString("en-IN")} cash / ₹${upiTotal.toLocaleString("en-IN")} UPI`,
      `Avg order value: ₹${avgOrder}. ${orderCount} order${orderCount !== 1 ? "s" : ""} this ${period}`,
    ];

    // ── Yesterday comparison (today mode only) ────────────────────────────────
    let yesterdayRevenue: number | null = null;
    let revenueVsYesterday: { amount: number; positive: boolean } | null = null;
    if (period === "today") {
      const yStart = businessDayStart(addDays(todayStr, -1), reset);
      const yEnd = businessDayStart(todayStr, reset);
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
      yesterdayRevenue: yesterdayRevenue !== null ? fmt(yesterdayRevenue) : null,
      revenueVsYesterday,
      period,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[GET /api/analytics]", e);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
