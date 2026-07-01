import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { businessDate } from "@/lib/businessDay";
import { createWithToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

// POST /api/orders/counter — POS counter order placement
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, paymentMethod = "cash", mobile } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Resolve prices from the database — never trust client-supplied prices.
    const requestedIds = items.map((i: { id: string }) => i.id);
    const dbItems = await prisma.menuItem.findMany({ where: { id: { in: requestedIds } } });
    const dbById = new Map(dbItems.map((m) => [m.id, m]));

    const lineItems: { menuItemId: string; qty: number; price: number }[] = [];
    for (const i of items as { id: string; qty: number }[]) {
      const m = dbById.get(i.id);
      if (!m) {
        return NextResponse.json({ error: `Unknown item: ${i.id}` }, { status: 400 });
      }
      const qty = Math.floor(Number(i.qty));
      if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
        return NextResponse.json({ error: `Invalid quantity for ${m.name}` }, { status: 400 });
      }
      lineItems.push({ menuItemId: m.id, qty, price: m.price });
    }

    const total = lineItems.reduce((s, i) => s + i.price * i.qty, 0);

    const settings = await prisma.shopSettings.findUnique({
      where: { id: "default" },
      select: { tokenResetTime: true },
    });
    const today = businessDate(settings?.tokenResetTime ?? "07:00");

    const isCounterPending = paymentMethod === "counter_pending";
    const isCounterUpi = paymentMethod === "counter_upi_pending";
    const needsPaymentConfirm = isCounterPending || isCounterUpi;
    const tokenStatus = needsPaymentConfirm ? "awaiting_payment" : "pending";
    // Store actual payment method for display
    const storedPaymentMethod = isCounterUpi ? "upi" : isCounterPending ? null : paymentMethod;

    // Atomically allocate a unique, sequential token number (retries on race).
    const order = await createWithToken(today, (tokenNumber) =>
      prisma.order.create({
        data: {
          source: "counter",
          status: "pending",
          total,
          paymentMethod: storedPaymentMethod,
          mobile: mobile || null,
          tokenNumber,
          items: {
            create: lineItems,
          },
          token: {
            create: {
              tokenNumber,
              date: today,
              status: tokenStatus,
            },
          },
        },
        include: {
          token: true,
          items: { include: { menuItem: true } },
        },
      })
    );
    const tokenNumber = order.tokenNumber!;

    await supabaseAdmin
      .channel("tokens")
      .send({
        type: "broadcast",
        event: "new_order",
        payload: {
          tokenId: order.token?.id,
          tokenNumber,
          orderId: order.id,
          status: tokenStatus,
          total,
          paymentMethod: storedPaymentMethod,
          items: order.items.map((it) => ({
            id: it.id,
            name: it.menuItem?.name ?? "Item",
            qty: it.qty,
            price: it.price,
          })),
        },
      })
      .catch(() => {});

    return NextResponse.json(
      {
        order: {
          id: order.id,
          tokenNumber: order.tokenNumber,
          tokenId: order.token?.id,
          total: order.total,
          status: order.status,
          tokenStatus,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[POST /api/orders/counter]", e);
    return NextResponse.json({ error: "Failed to create counter order" }, { status: 500 });
  }
}
