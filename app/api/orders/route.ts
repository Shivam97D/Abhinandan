import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { businessDate } from "@/lib/businessDay";
import { createWithToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: { include: { menuItem: true } },
        token: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ orders });
  } catch (e) {
    console.error("[GET /api/orders]", e);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // `source` is intentionally NOT taken from the body: this is the public,
    // login-less endpoint, so every order it creates is a customer self-order.
    // Counter orders go through the authenticated /api/orders/counter route.
    const { items, paymentMethod = "cash", mobile, sessionId } = body;
    const source = "customer";

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
      if (!m.available) {
        return NextResponse.json({ error: `Item unavailable: ${m.name}` }, { status: 400 });
      }
      const qty = Math.floor(Number(i.qty));
      if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
        return NextResponse.json({ error: `Invalid quantity for ${m.name}` }, { status: 400 });
      }
      lineItems.push({ menuItemId: m.id, qty, price: m.price });
    }

    const total = lineItems.reduce((s, i) => s + i.price * i.qty, 0);

    // Settings drive both the business-day boundary (token reset) and UPI confirm.
    const settings = await prisma.shopSettings.findUnique({
      where: { id: "default" },
    });
    const manualUpiConfirm = settings?.manualUpiConfirm ?? true;
    const today = businessDate(settings?.tokenResetTime ?? "07:00");

    // counter_pending = customer walked to counter, counter staff confirms payment later
    // awaiting_payment token status signals the counter queue to show "confirm payment" button
    const isCounterPending = paymentMethod === "counter_pending";
    const isUpiPending = paymentMethod === "upi" && manualUpiConfirm;
    const tokenStatus = (isCounterPending || isUpiPending) ? "awaiting_payment" : "pending";

    // Atomically allocate a unique, sequential token number (retries on race).
    const order = await createWithToken(today, (tokenNumber) =>
      prisma.order.create({
        data: {
          source,
          status: "pending",
          total,
          paymentMethod: isCounterPending ? null : paymentMethod,
          mobile: mobile || null,
          tokenNumber,
          sessionId: sessionId || null,
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

    // Broadcast new order with full item details so counter queue renders immediately
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
          paymentMethod: isCounterPending ? null : paymentMethod,
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
    console.error("[POST /api/orders]", e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
